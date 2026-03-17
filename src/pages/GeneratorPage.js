// src/Pages/GeneratorPage.js
import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Container,
  Typography,
  TextField,
  FormControlLabel,
  Checkbox,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
} from '@mui/material';

import shieldLogo from '../assets/shield.png';
import { drawQrWithLogo } from '../CanvasUtils';
import { supabase } from '../utils/supabaseClient';

import TargetUrlInput from '../Components/TargetUrlInput';
import UtmFields from '../Components/UtmFields';
import PdfModeFields from '../Components/PdfModeFields';
import SaveOptions from '../Components/SaveOptions';
import ColorPicker from '../Components/Generator/ColorPicker';
import LogoUpload from '../Components/LogoUpload';
import ExportButtons from '../Components/ExportButtons';
import QrCanvas from '../Components/QrCanvas';
import ToastAlerts from '../Components/ToastAlerts';

import generateShortCode from '../utils/generateShortCode';
import sanitizeShortcode, { withRandomSuffix } from '../utils/sanitizeShortcode';
import sanitizeFilename from '../utils/sanitizeFilename';

const SHORT_BASE = 'https://www.roadhome.io';
const PDF_BUCKET = 'marketing-pdfs';

// Safe URL validator
const isValidUrl = (value) => {
  try {
    // Require protocol for clarity
    const u = new URL(value);
    return !!u.protocol && !!u.host;
  } catch {
    return false;
  }
};

const GeneratorPage = () => {
  const [mode, setMode] = useState('url');

  // URL + UTM state
  const [baseUrl, setBaseUrl] = useState('https://roadhomeprogram.org/');
  const [utmSource, setUtmSource] = useState('');
  const [utmMedium, setUtmMedium] = useState('');
  const [utmCampaign, setUtmCampaign] = useState('');
  const [pdfFile, setPdfFile] = useState(null);
  const [fileTitle, setFileTitle] = useState('');

  // QR visuals
  const [foregroundColor, setForegroundColor] = useState('#006633');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [logoFile, setLogoFile] = useState(null);
  const [logoScale, setLogoScale] = useState(0.2);

  // Save options + feedback
  const [linkType, setLinkType] = useState('qr');
  const [isSaving, setIsSaving] = useState(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [errorSnackbar, setErrorSnackbar] = useState(false);
  const [errorMessage, setErrorMessage] = useState('Error saving QR code. Please try again.');

  // Results
  const [shortCode, setShortCode] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [targetUrl, setTargetUrl] = useState('');

  // Shortcode controls
  const [customShort, setCustomShort] = useState('');
  const [useCampaignAsShort, setUseCampaignAsShort] = useState(false);

  const canvasRef = useRef(null);
  const isBaseUrlValid = isValidUrl(baseUrl);
  const showBaseUrlError = Boolean(baseUrl && !isBaseUrlValid);
  const pdfPreviewUrl = shortUrl || `${SHORT_BASE}/preview`;
  const previewTarget = shortUrl || (mode === 'pdf' ? pdfPreviewUrl : targetUrl);
  const disableSave = mode === 'url'
    ? !isBaseUrlValid
    : !(fileTitle.trim() && pdfFile);

  // Compose preview URL as inputs change (safe if baseUrl is empty/invalid)
  useEffect(() => {
    if (mode !== 'url') return;
    try {
      if (!isValidUrl(baseUrl)) {
        setTargetUrl('');
        return;
      }
      const url = new URL(baseUrl);
      const params = new URLSearchParams();
      if (utmSource) params.append('utm_source', utmSource);
      if (utmMedium) params.append('utm_medium', utmMedium);
      if (utmCampaign) params.append('utm_campaign', utmCampaign);
      url.search = params.toString();
      setTargetUrl(url.toString());
    } catch (err) {
      console.error('Invalid base URL while composing preview:', baseUrl, err);
      setTargetUrl('');
    }
  }, [baseUrl, utmSource, utmMedium, utmCampaign, mode]);

  // Draw QR when needed (skip if no targetUrl yet)
  useEffect(() => {
    if (linkType !== 'link' && previewTarget) {
      drawQrWithLogo({
        canvas: canvasRef.current,
        text: previewTarget,
        foregroundColor,
        backgroundColor,
        logoFile: logoFile || shieldLogo,
        logoScale,
        logoPaddingPx: 1,
      });
    }
  }, [previewTarget, foregroundColor, backgroundColor, logoFile, logoScale, linkType]);

  // Collision check helper: try up to 3 variants
  const resolveUniqueShortcode = async (candidate) => {
    const base = sanitizeShortcode(candidate);
    let code = base || generateShortCode(); // fallback if blank

    for (let i = 0; i < 3; i++) {
      const { data, error } = await supabase
        .from('qr_redirects')
        .select('id')
        .eq('short_code', code)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Supabase select error (short_code check):', error);
        break;
      }

      if (!data) return code; // not found → OK

      // found → add small suffix and try again
      code = withRandomSuffix(base || 'link', 3);
    }

    // If still colliding, final fallback to a random code
    return generateShortCode();
  };

  const getChosenShortcodeSeed = () => {
    if (customShort) return sanitizeShortcode(customShort);
    if (mode === 'url' && useCampaignAsShort && utmCampaign) {
      return sanitizeShortcode(utmCampaign);
    }
    return '';
  };

  const previewShortcode = (() => {
    if (customShort) return sanitizeShortcode(customShort) || '(auto-generated)';
    if (mode === 'url' && useCampaignAsShort && utmCampaign) {
      return sanitizeShortcode(utmCampaign) || '(auto-generated)';
    }
    return '(auto-generated)';
  })();

  const handleSaveUrl = async () => {
    // Guard: need a valid base URL to save
    if (!isBaseUrlValid) {
      console.error('Save blocked: baseUrl is empty or invalid:', baseUrl);
      setErrorMessage('Please enter a valid base URL (including https://) before saving.');
      setErrorSnackbar(true);
      return;
    }

    // 1) Decide shortcode source: custom → campaign (if opted) → random
    const chosen = getChosenShortcodeSeed();

    // 2) Ensure uniqueness
    const code = await resolveUniqueShortcode(chosen);
    const short = `${SHORT_BASE}/${code}`;

    // 3) Build final target URL at save-time (safe because baseUrl validated above)
    const url = new URL(baseUrl);
    const params = new URLSearchParams();
    if (utmSource) params.append('utm_source', utmSource);
    if (utmMedium) params.append('utm_medium', utmMedium);
    if (utmCampaign) params.append('utm_campaign', utmCampaign);
    url.search = params.toString();
    const fullTargetUrl = url.toString();

    const redirectEntry = {
      short_code: code,
      full_url: fullTargetUrl,
      target_type: 'url',
    };

    const historyEntry = {
      base_url: baseUrl,
      utm_source: utmSource,
      utm_medium: utmMedium,
      utm_campaign: utmCampaign,
      utm_term: '',
      utm_content: '',
      qr_fg_color: foregroundColor,
      qr_bg_color: backgroundColor,
      logo_url: '',
      download_format: 'png',
      notes: '',
      full_url: fullTargetUrl,
      short_code: code,
      target_type: 'url',
      link_type: linkType,
      has_qr: linkType !== 'link',
      pdf_bucket: null,
      pdf_path: null,
      pdf_filename: null,
      file_title: null,
      mime_type: null,
      file_size: null,
    };

    const { error: redirectError } = await supabase.from('qr_redirects').insert([redirectEntry]);

    if (redirectError) {
      console.error('❌ Error saving redirect record:', redirectError);
      setErrorMessage(redirectError?.message || 'Error saving QR code. Please try again.');
      setErrorSnackbar(true);
      return;
    }

    const { error: historyError } = await supabase.from('qr_utm_generator_logs').insert([historyEntry]);

    if (historyError) {
      console.error('❌ Error saving generator history:', historyError);
      setErrorMessage(historyError?.message || 'Short link saved, but generator history failed to save.');
      setErrorSnackbar(true);
      return;
    }

    // 5) Success UI updates
    setShortCode(code);
    setShortUrl(short);
    setTargetUrl(fullTargetUrl);
    setOpenSnackbar(true);
    setErrorMessage('Error saving QR code. Please try again.');
  };

  const handleSavePdf = async () => {
    if (!fileTitle.trim()) {
      setErrorMessage('Please enter a document title before saving.');
      setErrorSnackbar(true);
      return;
    }

    if (!pdfFile) {
      setErrorMessage('Please upload a PDF before saving.');
      setErrorSnackbar(true);
      return;
    }

    if (pdfFile.type && pdfFile.type !== 'application/pdf') {
      setErrorMessage('The uploaded file must be a PDF.');
      setErrorSnackbar(true);
      return;
    }

    const chosen = getChosenShortcodeSeed();
    const code = await resolveUniqueShortcode(chosen);
    const short = `${SHORT_BASE}/${code}`;
    const safeFilename = sanitizeFilename(pdfFile.name || `${fileTitle}.pdf`);
    const filePath = `${code}/${Date.now()}-${safeFilename}`;
    const storageReference = `storage://${PDF_BUCKET}/${filePath}`;

    const { error: uploadError } = await supabase.storage
      .from(PDF_BUCKET)
      .upload(filePath, pdfFile, {
        contentType: pdfFile.type || 'application/pdf',
        upsert: false,
      });

    if (uploadError) {
      console.error('❌ Error uploading PDF:', uploadError);
      setErrorMessage(uploadError.message || 'PDF upload failed. Please try again.');
      setErrorSnackbar(true);
      return;
    }

    const redirectEntry = {
      short_code: code,
      full_url: storageReference,
      target_type: 'pdf',
      pdf_bucket: PDF_BUCKET,
      pdf_path: filePath,
      pdf_filename: pdfFile.name,
    };

    const { error: redirectError } = await supabase.from('qr_redirects').insert([redirectEntry]);

    if (redirectError) {
      console.error('❌ Error saving PDF redirect record:', redirectError);
      await supabase.storage.from(PDF_BUCKET).remove([filePath]).catch((cleanupError) => {
        console.error('Failed to clean up uploaded PDF after redirect insert failure:', cleanupError);
      });
      setErrorMessage(redirectError.message || 'PDF uploaded, but redirect record failed to save.');
      setErrorSnackbar(true);
      return;
    }

    const historyEntry = {
      base_url: '',
      utm_source: '',
      utm_medium: '',
      utm_campaign: '',
      utm_term: '',
      utm_content: '',
      qr_fg_color: foregroundColor,
      qr_bg_color: backgroundColor,
      logo_url: '',
      download_format: 'png',
      notes: '',
      full_url: short,
      short_code: code,
      target_type: 'pdf',
      pdf_bucket: PDF_BUCKET,
      pdf_path: filePath,
      pdf_filename: pdfFile.name,
      file_title: fileTitle.trim(),
      mime_type: pdfFile.type || 'application/pdf',
      file_size: pdfFile.size || null,
      link_type: linkType,
      has_qr: linkType !== 'link',
    };

    const { error: historyError } = await supabase.from('qr_utm_generator_logs').insert([historyEntry]);

    if (historyError) {
      console.error('❌ Error saving PDF generator history:', historyError);
      await supabase.storage.from(PDF_BUCKET).remove([filePath]).catch((cleanupError) => {
        console.error('Failed to clean up uploaded PDF after history insert failure:', cleanupError);
      });
      setErrorMessage(historyError.message || 'PDF saved, but generator history failed to save.');
      setErrorSnackbar(true);
      return;
    }

    setShortCode(code);
    setShortUrl(short);
    setTargetUrl(short);
    setOpenSnackbar(true);
    setErrorMessage('Error saving QR code. Please try again.');
  };

  const handleSaveQr = async () => {
    setIsSaving(true);
    try {
      if (mode === 'pdf') {
        await handleSavePdf();
        return;
      }

      await handleSaveUrl();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Stack spacing={2}>
        <Box>
          <Typography variant="h5" gutterBottom>
            QR + UTM Generator
          </Typography>
          <ToggleButtonGroup
            value={mode}
            exclusive
            onChange={(_, nextMode) => {
              if (nextMode) setMode(nextMode);
            }}
            size="small"
            color="primary"
            disabled={isSaving}
          >
            <ToggleButton value="url">URL</ToggleButton>
            <ToggleButton value="pdf">PDF</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {mode === 'url' ? (
          <>
            <TargetUrlInput
              baseUrl={baseUrl}
              setBaseUrl={setBaseUrl}
              finalUrl={targetUrl}
              showBaseUrlError={showBaseUrlError}
              disabled={isSaving}
            />
            <UtmFields
              utmSource={utmSource}
              setUtmSource={setUtmSource}
              utmMedium={utmMedium}
              setUtmMedium={setUtmMedium}
              utmCampaign={utmCampaign}
              setUtmCampaign={setUtmCampaign}
              disabled={isSaving}
            />
          </>
        ) : (
          <PdfModeFields
            fileTitle={fileTitle}
            setFileTitle={setFileTitle}
            pdfFile={pdfFile}
            setPdfFile={setPdfFile}
            disabled={isSaving}
          />
        )}
      </Stack>

      {/* Shortcode controls */}
      <Box mt={2}>
        <Stack spacing={1}>
          <TextField
            label="Custom Shortcode (optional)"
            placeholder="e.g., jonmurphy, weekly-recap-0805"
            value={customShort}
            onChange={(e) => setCustomShort(e.target.value)}
            fullWidth
            disabled={isSaving}
            inputProps={{ maxLength: 64 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={useCampaignAsShort}
                onChange={(e) => setUseCampaignAsShort(e.target.checked)}
                disabled={isSaving}
              />
            }
            label="Use UTM Campaign as Shortcode when Custom Shortcode is empty"
          />
          <Typography variant="caption" color="text.secondary">
            Shortcode preview: {previewShortcode || '(auto-generated)'}
          </Typography>
        </Stack>
      </Box>

      {/* Save options, colors, logo, export */}
      <SaveOptions linkType={linkType} setLinkType={setLinkType} disabled={isSaving} />
      {linkType !== 'link' && (
        <ColorPicker
          foregroundColor={foregroundColor}
          setForegroundColor={setForegroundColor}
          backgroundColor={backgroundColor}
          setBackgroundColor={setBackgroundColor}
        />
      )}
      <ExportButtons
        targetUrl={previewTarget}
        canvasRef={canvasRef}
        onSave={handleSaveQr}
        linkType={linkType}
        disableSave={disableSave}
        foregroundColor={foregroundColor}
        backgroundColor={backgroundColor}
        logoFileOrUrl={logoFile || shieldLogo}
        logoScale={logoScale}
        isSaving={isSaving}
      />
      {linkType !== 'link' && (
        <LogoUpload
          logoFile={logoFile}
          setLogoFile={setLogoFile}
          logoScale={logoScale}
          setLogoScale={setLogoScale}
          disabled={isSaving}
        />
      )}

      {/* QR preview */}
      {linkType !== 'link' && (
        <QrCanvas canvasRef={canvasRef} backgroundColor={backgroundColor} />
      )}

      {/* Result */}
      {(shortCode || shortUrl || mode === 'pdf') && (
        <Box mt={2}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            Final short link
          </Typography>
          <Typography variant="body2" sx={{ mt: 0.5 }}>
            Short link:{' '}
            <a href={shortUrl || pdfPreviewUrl} target="_blank" rel="noopener noreferrer">
              {shortUrl || pdfPreviewUrl}
            </a>
          </Typography>
          <Button
            size="small"
            variant="outlined"
            sx={{ mt: 1 }}
            onClick={() => {
              navigator.clipboard.writeText(shortUrl || pdfPreviewUrl);
              setOpenSnackbar(true);
            }}
            disabled={isSaving}
          >
            Copy Short Link
          </Button>
        </Box>
      )}

      {/* Toasts */}
      <ToastAlerts
        openSnackbar={openSnackbar}
        setOpenSnackbar={setOpenSnackbar}
        errorSnackbar={errorSnackbar}
        setErrorSnackbar={setErrorSnackbar}
        shortCode={shortCode}
        errorMessage={errorMessage}
      />
    </Container>
  );
};

export default GeneratorPage;

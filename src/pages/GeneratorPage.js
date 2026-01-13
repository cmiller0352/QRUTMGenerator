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
} from '@mui/material';

import shieldLogo from '../assets/shield.png';
import { drawQrWithLogo } from '../CanvasUtils';
import { supabase } from '../utils/supabaseClient';

import TargetUrlInput from '../Components/TargetUrlInput';
import UtmFields from '../Components/UtmFields';
import SaveOptions from '../Components/SaveOptions';
import ColorPicker from '../Components/Generator/ColorPicker';
import LogoUpload from '../Components/LogoUpload';
import ExportButtons from '../Components/ExportButtons';
import QrCanvas from '../Components/QrCanvas';
import ToastAlerts from '../Components/ToastAlerts';

import generateShortCode from '../utils/generateShortCode';
import sanitizeShortcode, { withRandomSuffix } from '../utils/sanitizeShortcode';

const SHORT_BASE = 'https://www.roadhome.io';

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
  // URL + UTM state
  const [baseUrl, setBaseUrl] = useState('https://roadhomeprogram.org/');
  const [utmSource, setUtmSource] = useState('');
  const [utmMedium, setUtmMedium] = useState('');
  const [utmCampaign, setUtmCampaign] = useState('');

  // QR visuals
  const [foregroundColor, setForegroundColor] = useState('#006633');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [logoFile, setLogoFile] = useState(null);
  const [logoScale, setLogoScale] = useState(0.2);

  // Save options + feedback
  const [linkType, setLinkType] = useState('qr');
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

  // Compose preview URL as inputs change (safe if baseUrl is empty/invalid)
  useEffect(() => {
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
  }, [baseUrl, utmSource, utmMedium, utmCampaign]);

  // Draw QR when needed (skip if no targetUrl yet)
  useEffect(() => {
    if (linkType !== 'link' && targetUrl) {
      drawQrWithLogo({
        canvas: canvasRef.current,
        text: targetUrl,
        foregroundColor,
        backgroundColor,
        logoFile: logoFile || shieldLogo,
        logoScale,
        logoPaddingPx: 1,
      });
    }
  }, [targetUrl, foregroundColor, backgroundColor, logoFile, logoScale, linkType]);

  // Collision check helper: try up to 3 variants
  const resolveUniqueShortcode = async (candidate) => {
    const base = sanitizeShortcode(candidate);
    let code = base || generateShortCode(); // fallback if blank

    for (let i = 0; i < 3; i++) {
      const { data, error } = await supabase
        .from('qr_utm_generator_logs')
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

  const previewShortcode = (() => {
    if (customShort) return sanitizeShortcode(customShort) || '(auto-generated)';
    if (useCampaignAsShort && utmCampaign) {
      return sanitizeShortcode(utmCampaign) || '(auto-generated)';
    }
    return '(auto-generated)';
  })();

  const handleSaveQr = async () => {
    // Guard: need a valid base URL to save
    if (!isBaseUrlValid) {
      console.error('Save blocked: baseUrl is empty or invalid:', baseUrl);
      setErrorMessage('Please enter a valid base URL (including https://) before saving.');
      setErrorSnackbar(true);
      return;
    }

    // 1) Decide shortcode source: custom → campaign (if opted) → random
    let chosen = '';
    if (customShort) {
      chosen = sanitizeShortcode(customShort);
    } else if (useCampaignAsShort && utmCampaign) {
      chosen = sanitizeShortcode(utmCampaign);
    }

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

    // 4) Insert record
    const entry = {
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
      link_type: linkType,
      has_qr: linkType !== 'link',
    };

    const { error } = await supabase.from('qr_utm_generator_logs').insert([entry]);

    if (error) {
      console.error('❌ Error saving to Supabase:', error);
      setErrorMessage(error?.message || 'Error saving QR code. Please try again.');
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

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Target + UTM */}
      <TargetUrlInput
        baseUrl={baseUrl}
        setBaseUrl={setBaseUrl}
        finalUrl={targetUrl}
        showBaseUrlError={showBaseUrlError}
      />
      <UtmFields
        utmSource={utmSource}
        setUtmSource={setUtmSource}
        utmMedium={utmMedium}
        setUtmMedium={setUtmMedium}
        utmCampaign={utmCampaign}
        setUtmCampaign={setUtmCampaign}
      />

      {/* Shortcode controls */}
      <Box mt={2}>
        <Stack spacing={1}>
          <TextField
            label="Custom Shortcode (optional)"
            placeholder="e.g., jonmurphy, weekly-recap-0805"
            value={customShort}
            onChange={(e) => setCustomShort(e.target.value)}
            fullWidth
            inputProps={{ maxLength: 64 }}
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={useCampaignAsShort}
                onChange={(e) => setUseCampaignAsShort(e.target.checked)}
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
      <SaveOptions linkType={linkType} setLinkType={setLinkType} />
      {linkType !== 'link' && (
        <ColorPicker
          foregroundColor={foregroundColor}
          setForegroundColor={setForegroundColor}
          backgroundColor={backgroundColor}
          setBackgroundColor={setBackgroundColor}
        />
      )}
      <ExportButtons
        targetUrl={targetUrl}
        canvasRef={canvasRef}
        onSave={handleSaveQr}
        linkType={linkType}
        disableSave={!isBaseUrlValid}
        foregroundColor={foregroundColor}
        backgroundColor={backgroundColor}
        logoFileOrUrl={logoFile || shieldLogo}
        logoScale={logoScale}
      />
      {linkType !== 'link' && (
        <LogoUpload
          logoFile={logoFile}
          setLogoFile={setLogoFile}
          logoScale={logoScale}
          setLogoScale={setLogoScale}
        />
      )}

      {/* QR preview */}
      {linkType !== 'link' && (
        <QrCanvas canvasRef={canvasRef} backgroundColor={backgroundColor} />
      )}

      {/* Result */}
      {(shortCode || shortUrl) && (
        <Box mt={2}>
          <Typography variant="body2">
            Short link:{' '}
            <a href={shortUrl} target="_blank" rel="noopener noreferrer">
              {shortUrl}
            </a>
          </Typography>
          <Button
            size="small"
            variant="outlined"
            sx={{ mt: 1 }}
            onClick={() => {
              navigator.clipboard.writeText(shortUrl);
              setOpenSnackbar(true);
            }}
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

// src/App.js
import React, { useState, useEffect, useRef } from 'react';
import { Box, Button, Container, Typography } from '@mui/material';
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

const GeneratorPage = () => {
  const [baseUrl, setBaseUrl] = useState('https://roadhomeprogram.org/');
  const [utmSource, setUtmSource] = useState('');
  const [utmMedium, setUtmMedium] = useState('');
  const [utmCampaign, setUtmCampaign] = useState('');
  const [foregroundColor, setForegroundColor] = useState('#006633');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [logoFile, setLogoFile] = useState(null);
  const [logoScale, setLogoScale] = useState(0.2);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [errorSnackbar, setErrorSnackbar] = useState(false);
  const [linkType, setLinkType] = useState('qr');
  const [shortCode, setShortCode] = useState('');
  const [shortUrl, setShortUrl] = useState('');
  const [targetUrl, setTargetUrl] = useState('');

  const canvasRef = useRef(null);

  useEffect(() => {
    const url = new URL(baseUrl);
    const params = new URLSearchParams();
    if (utmSource) params.append('utm_source', utmSource);
    if (utmMedium) params.append('utm_medium', utmMedium);
    if (utmCampaign) params.append('utm_campaign', utmCampaign);
    url.search = params.toString();
    setTargetUrl(url.toString());
  }, [baseUrl, utmSource, utmMedium, utmCampaign]);

  useEffect(() => {
    if (linkType !== 'link') {
      drawQrWithLogo({
        canvas: canvasRef.current,
        text: targetUrl,
        foregroundColor,
        backgroundColor,
        logoFile: logoFile || shieldLogo,
        logoScale
      });
    }
  }, [targetUrl, foregroundColor, backgroundColor, logoFile, logoScale, linkType]);

  const handleSaveQr = async () => {
    const code = generateShortCode();
    const short = `https://www.roadhome.io/${code}`;

    // ✅ Build URL from scratch at save-time
    const url = new URL(baseUrl);
    const params = new URLSearchParams();
    if (utmSource) params.append('utm_source', utmSource);
    if (utmMedium) params.append('utm_medium', utmMedium);
    if (utmCampaign) params.append('utm_campaign', utmCampaign);
    url.search = params.toString();
    const fullTargetUrl = url.toString();

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
      has_qr: linkType !== 'link'
    };

    const { error } = await supabase.from('qr_utm_generator_logs').insert([entry]);

    if (error) {
      console.error('❌ Error saving to Supabase:', error);
      setErrorSnackbar(true);
    } else {
      setShortCode(code);
      setShortUrl(short);
      setTargetUrl(fullTargetUrl); // ✅ update display
      setOpenSnackbar(true);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <TargetUrlInput targetUrl={targetUrl} setBaseUrl={setBaseUrl} />
      <UtmFields
        utmSource={utmSource} setUtmSource={setUtmSource}
        utmMedium={utmMedium} setUtmMedium={setUtmMedium}
        utmCampaign={utmCampaign} setUtmCampaign={setUtmCampaign}
      />
      <SaveOptions linkType={linkType} setLinkType={setLinkType} />
      <ColorPicker
        foregroundColor={foregroundColor} setForegroundColor={setForegroundColor}
        backgroundColor={backgroundColor} setBackgroundColor={setBackgroundColor}
      />
      <ExportButtons targetUrl={targetUrl} canvasRef={canvasRef} onSave={handleSaveQr} />
      <LogoUpload logoFile={logoFile} setLogoFile={setLogoFile} logoScale={logoScale} setLogoScale={setLogoScale} />

      {linkType !== 'link' && <QrCanvas canvasRef={canvasRef} backgroundColor={backgroundColor} />}

      {(shortCode || shortUrl) && (
        <Box mt={2}>
          <Typography variant="body2">
            Short link: <a href={shortUrl} target="_blank" rel="noopener noreferrer">{shortUrl}</a>
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

      <ToastAlerts
        openSnackbar={openSnackbar} setOpenSnackbar={setOpenSnackbar}
        errorSnackbar={errorSnackbar} setErrorSnackbar={setErrorSnackbar}
        shortCode={shortCode}
      />
    </Container>
  );
};

export default GeneratorPage;

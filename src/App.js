// Updated App.js: Fix UTM input spacing + make target URL auto-update from UTM values
import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Container,
  Grid,
  Slider,
  TextField,
  Typography,
  Stack,
  Snackbar,
  Alert
} from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ImageIcon from '@mui/icons-material/Image';
import DownloadIcon from '@mui/icons-material/Download';
import SaveIcon from '@mui/icons-material/Save';
import { drawQrWithLogo, copyCanvasImageToClipboard, exportSvg, exportPng } from './CanvasUtils';
import shieldLogo from './assets/shield.png';
import { supabase } from './supabaseClient';
import { useSearchParams } from 'react-router-dom';

const App = () => {
  const [baseUrl, setBaseUrl] = useState('https://roadhomeprogram.org/');
  const [targetUrl, setTargetUrl] = useState(baseUrl);
  const [utmSource, setUtmSource] = useState('');
  const [utmMedium, setUtmMedium] = useState('');
  const [utmCampaign, setUtmCampaign] = useState('');
  const [foregroundColor, setForegroundColor] = useState('#006633');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [logoFile, setLogoFile] = useState(null);
  const [logoScale, setLogoScale] = useState(0.2);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [errorSnackbar, setErrorSnackbar] = useState(false);
  const canvasRef = useRef(null);
  const [searchParams] = useSearchParams();

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
    drawQrWithLogo({
      canvas: canvasRef.current,
      text: targetUrl,
      foregroundColor,
      backgroundColor,
      logoFile: logoFile || shieldLogo,
      logoScale
    });
  }, [targetUrl, foregroundColor, backgroundColor, logoFile, logoScale]);

  const handleSaveQr = async () => {
    const { data, error } = await supabase.from('qr_utm_generator_logs').insert([
      {
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
        full_url: targetUrl
      }
    ]);
    if (error) {
      console.error('❌ Error saving to Supabase:', error);
      setErrorSnackbar(true);
    } else {
      setOpenSnackbar(true);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5" color="primary">QR + UTM Generator</Typography>
        <Button variant="outlined" href="/history">View History</Button>
      </Box>

      <TextField
        label="Target URL"
        fullWidth
        value={targetUrl}
        onChange={(e) => setBaseUrl(e.target.value)}
        inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.9rem' } }}
        margin="dense"
      />

      <Grid container spacing={2} mt={1} mb={1}>
        <Grid item xs={4}>
          <TextField label="UTM Source" value={utmSource} onChange={(e) => setUtmSource(e.target.value)} fullWidth />
        </Grid>
        <Grid item xs={4}>
          <TextField label="UTM Medium" value={utmMedium} onChange={(e) => setUtmMedium(e.target.value)} fullWidth />
        </Grid>
        <Grid item xs={4}>
          <TextField label="UTM Campaign" value={utmCampaign} onChange={(e) => setUtmCampaign(e.target.value)} fullWidth />
        </Grid>
        <Grid item xs={6}>
          <TextField label="Foreground Color" value={foregroundColor} onChange={(e) => setForegroundColor(e.target.value)} fullWidth />
        </Grid>
        <Grid item xs={6}>
          <TextField label="Background Color" value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)} fullWidth />
        </Grid>
      </Grid>

      <Stack direction="row" spacing={2} justifyContent="flex-start" mt={2} mb={2}>
        <Button variant="outlined" onClick={() => navigator.clipboard.writeText(targetUrl)} startIcon={<ContentCopyIcon />}>Copy URL</Button>
        <Button variant="outlined" onClick={() => copyCanvasImageToClipboard(canvasRef)} startIcon={<ImageIcon />}>Copy QR</Button>
        <Button variant="outlined" onClick={() => exportPng(canvasRef)} startIcon={<DownloadIcon />}>Export PNG</Button>
        <Button variant="outlined" onClick={() => exportSvg(canvasRef)} startIcon={<DownloadIcon />}>Export SVG</Button>
        <Button variant="contained" onClick={handleSaveQr} startIcon={<SaveIcon />}>Save</Button>
      </Stack>

      <Stack direction="row" spacing={2} alignItems="center" mb={2}>
        <Button variant="outlined" component="label" startIcon={<UploadIcon />}>
          Upload Logo
          <input type="file" hidden accept="image/*" onChange={(e) => setLogoFile(e.target.files[0])} />
        </Button>
        <Typography>Logo Size</Typography>
        <Slider min={0.05} max={0.4} step={0.01} value={logoScale} onChange={(e, val) => setLogoScale(val)} style={{ width: '200px' }} />
      </Stack>

      <Box display="flex" justifyContent="center">
        <canvas ref={canvasRef} style={{ border: '1px solid #ccc', backgroundColor: backgroundColor }} width={300} height={300} />
      </Box>

      <Snackbar open={openSnackbar} autoHideDuration={3000} onClose={() => setOpenSnackbar(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setOpenSnackbar(false)} severity="success" sx={{ width: '100%' }}>QR code saved to history!</Alert>
      </Snackbar>

      <Snackbar open={errorSnackbar} autoHideDuration={4000} onClose={() => setErrorSnackbar(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert onClose={() => setErrorSnackbar(false)} severity="error" sx={{ width: '100%' }}>Error saving QR code. Please try again.</Alert>
      </Snackbar>
    </Container>
  );
};

export default App;

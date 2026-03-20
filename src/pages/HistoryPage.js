import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  Menu,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Snackbar,
  Stack,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DownloadIcon from '@mui/icons-material/Download';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LinkIcon from '@mui/icons-material/Link';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import shieldLogo from '../assets/shield.png';
import { supabase } from '../utils/supabaseClient';
import formatFileSize from '../utils/formatFileSize';
import buildQrFilename from '../utils/buildQrFilename';
import { exportPng, exportQrSvg, renderQrToCanvas } from '../CanvasUtils';

const VIEW_CONFIG = {
  qr: {
    label: 'QR Codes',
    view: 'v_qr_history',
    idField: 'history_id',
    searchColumns: [
      'title',
      'display_name',
      'short_code',
      'short_url',
      'utm_campaign',
      'utm_source',
      'utm_medium',
      'pdf_filename',
      'history_full_url',
      'redirect_full_url',
      'base_url',
      'file_title',
      'notes',
    ],
  },
  shortlink: {
    label: 'Short Links',
    view: 'v_shortlink_history',
    idField: 'redirect_id',
    searchColumns: [
      'title',
      'display_name',
      'short_code',
      'short_url',
      'destination_url',
      'utm_campaign',
      'utm_source',
      'utm_medium',
      'pdf_filename',
      'file_title',
      'notes',
    ],
  },
};

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'mostScans', label: 'Most scans' },
  { value: 'recentlyScanned', label: 'Recently scanned' },
  { value: 'title', label: 'Title A-Z' },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50];
const QR_LOGO_SCALE = 0.2;

const formatDate = (value) => {
  if (!value) return 'Never';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Unknown';
  return parsed.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

const sanitizeSearchTerm = (value) =>
  String(value || '')
    .trim()
    .replace(/[%,()]/g, ' ')
    .replace(/\s+/g, ' ');

const getSearchFilter = (viewKey, search) => {
  const term = sanitizeSearchTerm(search);
  if (!term) return null;
  return VIEW_CONFIG[viewKey].searchColumns
    .map((column) => `${column}.ilike.%${term}%`)
    .join(',');
};

const getSortConfig = (sortKey) => {
  switch (sortKey) {
    case 'oldest':
      return { column: 'created_at', ascending: true };
    case 'mostScans':
      return { column: 'scan_count', ascending: false, nullsFirst: false };
    case 'recentlyScanned':
      return { column: 'last_scanned_at', ascending: false, nullsFirst: false };
    case 'title':
      return { column: 'title', ascending: true, nullsFirst: false };
    case 'newest':
    default:
      return { column: 'created_at', ascending: false };
  }
};

const getRowTitle = (row) =>
  row.title || row.file_title || row.display_name || row.short_code || 'Untitled';

const getShortUrl = (row) => row.short_url || '';
const getQrPayloadUrl = (row) => row.qr_payload_url || row.short_url || '';

const getQrDestinationUrl = (row) =>
  row.history_full_url || row.redirect_full_url || row.base_url || row.short_url || '';

const getShortlinkDestinationUrl = (row) =>
  row.destination_url || row.short_url || '';

const getLogoSource = (row) => row.logo_url || shieldLogo;
const getLogoScale = (row) =>
  typeof row.logo_scale === 'number' && Number.isFinite(row.logo_scale) && row.logo_scale > 0
    ? row.logo_scale
    : QR_LOGO_SCALE;

async function copyText(text) {
  if (!text) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const input = document.createElement('textarea');
    input.value = text;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.focus();
    input.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(input);
    return copied;
  }
}

function openLink(url) {
  if (!url) return false;
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}

async function downloadQrPng(row) {
  const text = getQrPayloadUrl(row);
  if (!text) return;

  const canvas = document.createElement('canvas');
  await renderQrToCanvas({
    canvas,
    text,
    foregroundColor: row.qr_fg_color || '#000000',
    backgroundColor: row.qr_bg_color || '#ffffff',
    logoFile: getLogoSource(row),
    logoScale: getLogoScale(row),
  });

  exportPng(
    { current: canvas },
    buildQrFilename({
      title: row.title,
      shortCode: row.short_code,
      utmCampaign: row.utm_campaign,
      utmSource: row.utm_source,
      extension: 'png',
    })
  );
}

async function downloadQrSvg(row) {
  const text = getQrPayloadUrl(row);
  if (!text) return;

  await exportQrSvg({
    text,
    foregroundColor: row.qr_fg_color || '#000000',
    backgroundColor: row.qr_bg_color || '#ffffff',
    logoFileOrUrl: getLogoSource(row),
    logoScale: getLogoScale(row),
    filename: buildQrFilename({
      title: row.title,
      shortCode: row.short_code,
      utmCampaign: row.utm_campaign,
      utmSource: row.utm_source,
      extension: 'svg',
    }),
  });
}

function QrThumbnail({ row }) {
  const canvasRef = useRef(null);
  const [hasRenderError, setHasRenderError] = useState(false);
  const renderKey = [
    getQrPayloadUrl(row),
    row.qr_fg_color,
    row.qr_bg_color,
    row.logo_url,
    row.logo_scale,
    row.short_code,
  ].join('|');

  useEffect(() => {
    const canvas = canvasRef.current;
    let active = true;

    async function renderThumb() {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      setHasRenderError(false);
      ctx.clearRect(0, 0, canvas.width || 84, canvas.height || 84);
      if (!getQrPayloadUrl(row)) return;
      await renderQrToCanvas({
        canvas,
        text: getQrPayloadUrl(row),
        foregroundColor: row.qr_fg_color || '#000000',
        backgroundColor: row.qr_bg_color || '#ffffff',
        logoFile: getLogoSource(row),
        logoScale: getLogoScale(row),
        moduleScale: 3,
      });
      if (!active) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    renderThumb().catch(() => {
      if (active) setHasRenderError(true);
    });

    return () => {
      active = false;
    };
  }, [renderKey, row]);

  return (
    <Box
      sx={{
        width: 84,
        height: 84,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'common.white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      {hasRenderError ? (
        <QrCode2Icon color="action" sx={{ fontSize: 34 }} />
      ) : (
        <canvas
          ref={canvasRef}
          style={{ width: 76, height: 76, display: 'block' }}
          aria-label={`QR preview for ${getRowTitle(row)}`}
        />
      )}
    </Box>
  );
}

function HistoryToolbar({
  activeView,
  totalCount,
  searchInput,
  onSearchChange,
  sortKey,
  onSortChange,
  rowsPerPage,
  onRowsPerPageChange,
  onViewChange,
}) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 2.5, borderRadius: 3, mb: 3, backgroundColor: 'background.paper' }}
    >
      <Stack spacing={2}>
        <Stack
          direction={{ xs: 'column', lg: 'row' }}
          alignItems={{ xs: 'flex-start', lg: 'center' }}
          justifyContent="space-between"
          spacing={2}
        >
          <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              History
            </Typography>
            <Chip
              color="primary"
              label={`${totalCount} ${totalCount === 1 ? 'item' : 'items'}`}
              sx={{ fontWeight: 600 }}
            />
          </Stack>

          <ToggleButtonGroup
            value={activeView}
            exclusive
            onChange={(_, nextView) => {
              if (nextView) onViewChange(nextView);
            }}
            size="small"
          >
            <ToggleButton value="qr">QR Codes</ToggleButton>
            <ToggleButton value="shortlink">Short Links</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={2} alignItems="center">
          <TextField
            fullWidth
            value={searchInput}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder={`Search ${VIEW_CONFIG[activeView].label.toLowerCase()}`}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />

          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel id="history-sort-label">Sort</InputLabel>
            <Select
              labelId="history-sort-label"
              label="Sort"
              value={sortKey}
              onChange={(event) => onSortChange(event.target.value)}
            >
              {SORT_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel id="history-page-size-label">Rows</InputLabel>
            <Select
              labelId="history-page-size-label"
              label="Rows"
              value={rowsPerPage}
              onChange={(event) => onRowsPerPageChange(Number(event.target.value))}
            >
              {PAGE_SIZE_OPTIONS.map((value) => (
                <MenuItem key={value} value={value}>
                  {value}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      </Stack>
    </Paper>
  );
}

function RowStat({ label, value }) {
  return (
    <Box sx={{ minWidth: { xs: 'auto', md: 110 } }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {value}
      </Typography>
    </Box>
  );
}

function QrHistoryRow({ row, onCopy, onOpen, onDownloadPng, onDownloadSvg }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const shortUrl = getShortUrl(row);
  const destinationUrl = getQrDestinationUrl(row);
  const fileSize = formatFileSize(row.file_size);
  const missingQrLabel = !row.has_qr && row.item_type === 'link'
    ? 'Link only'
    : !row.has_qr && row.item_type === 'pdf-link'
      ? 'PDF link'
      : 'No QR saved';

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: '96px minmax(0, 2.1fr) repeat(3, minmax(120px, 0.8fr)) auto' },
          gap: 2,
          alignItems: 'center',
        }}
      >
        <Stack direction="row" spacing={1.5} alignItems="center">
          {row.has_qr ? (
            <QrThumbnail row={row} />
          ) : (
            <Box
              sx={{
                width: 84,
                height: 84,
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                bgcolor: 'grey.50',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              <LinkIcon color="action" sx={{ fontSize: 30 }} />
            </Box>
          )}
          <Box sx={{ display: { xs: 'block', lg: 'none' }, minWidth: 0 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
              {getRowTitle(row)}
            </Typography>
            <Typography variant="body2" color="primary" noWrap>
              {shortUrl || 'No short URL'}
            </Typography>
          </Box>
        </Stack>

        <Box sx={{ minWidth: 0, display: { xs: 'none', lg: 'block' } }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
              {getRowTitle(row)}
            </Typography>
            {row.item_type && <Chip size="small" label={row.item_type} variant="outlined" />}
            {fileSize && <Chip size="small" label={fileSize} variant="outlined" />}
          </Stack>
          <Typography variant="body2" color="primary" noWrap sx={{ mb: 0.5 }}>
            {shortUrl || 'No short URL'}
          </Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Typography variant="caption" color="text.secondary">
              {row.link_type || row.source_type || 'QR'}
            </Typography>
            {row.utm_campaign && (
              <Typography variant="caption" color="text.secondary">
                Campaign: {row.utm_campaign}
              </Typography>
            )}
            {row.utm_source && (
              <Typography variant="caption" color="text.secondary">
                Source: {row.utm_source}
              </Typography>
            )}
          </Stack>
        </Box>

        <RowStat label="Created" value={formatDate(row.created_at)} />
        <RowStat label="Scans" value={row.scan_count ?? 0} />
        <RowStat label="Last scanned" value={formatDate(row.last_scanned_at)} />

        <Stack
          direction={{ xs: 'row', lg: 'column' }}
          spacing={1}
          alignItems={{ xs: 'center', lg: 'flex-end' }}
          justifyContent="space-between"
        >
          {row.has_qr ? (
            <Button
              variant="contained"
              color="success"
              startIcon={<DownloadIcon />}
              onClick={() => onDownloadPng(row)}
              sx={{ whiteSpace: 'nowrap' }}
            >
              Download
            </Button>
          ) : (
            <Chip size="small" label={missingQrLabel} variant="outlined" />
          )}

          <Tooltip title="More actions">
            <IconButton onClick={(event) => setAnchorEl(event.currentTarget)}>
              <MoreVertIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      <Box sx={{ display: { xs: 'block', lg: 'none' }, mt: 1.5 }}>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {row.item_type && <Chip size="small" label={row.item_type} variant="outlined" />}
          {fileSize && <Chip size="small" label={fileSize} variant="outlined" />}
        </Stack>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            onCopy(shortUrl, 'Short URL copied');
          }}
        >
          <ContentCopyIcon fontSize="small" sx={{ mr: 1 }} />
          Copy short URL
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            onOpen(shortUrl, 'Opened short URL');
          }}
        >
          <LinkIcon fontSize="small" sx={{ mr: 1 }} />
          Open short URL
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            onOpen(destinationUrl, 'Opened destination');
          }}
        >
          <OpenInNewIcon fontSize="small" sx={{ mr: 1 }} />
          Open destination
        </MenuItem>
        <MenuItem
          disabled={!row.has_qr}
          onClick={() => {
            setAnchorEl(null);
            onDownloadPng(row);
          }}
        >
          <DownloadIcon fontSize="small" sx={{ mr: 1 }} />
          Download PNG
        </MenuItem>
        <MenuItem
          disabled={!row.has_qr}
          onClick={() => {
            setAnchorEl(null);
            onDownloadSvg(row);
          }}
        >
          <QrCode2Icon fontSize="small" sx={{ mr: 1 }} />
          Download SVG
        </MenuItem>
      </Menu>
    </Paper>
  );
}

function ShortlinkHistoryRow({ row, onCopy, onOpen }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const shortUrl = getShortUrl(row);
  const destinationUrl = getShortlinkDestinationUrl(row);

  return (
    <Paper variant="outlined" sx={{ p: 2, borderRadius: 3 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 2.5fr) repeat(3, minmax(120px, 0.8fr)) auto' },
          gap: 2,
          alignItems: 'center',
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.75 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }} noWrap>
              {getRowTitle(row)}
            </Typography>
            {row.item_type && <Chip size="small" label={row.item_type} variant="outlined" />}
          </Stack>
          <Typography variant="body2" color="primary" noWrap sx={{ mb: 0.5 }}>
            {shortUrl || 'No short URL'}
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            {destinationUrl || 'No destination URL'}
          </Typography>
        </Box>

        <RowStat label="Created" value={formatDate(row.created_at)} />
        <RowStat label="Scans" value={row.scan_count ?? 0} />
        <RowStat label="Last scanned" value={formatDate(row.last_scanned_at)} />

        <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', lg: 'flex-end' }}>
          <Tooltip title="More actions">
            <IconButton onClick={(event) => setAnchorEl(event.currentTarget)}>
              <MoreVertIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            onCopy(shortUrl, 'Short URL copied');
          }}
        >
          <ContentCopyIcon fontSize="small" sx={{ mr: 1 }} />
          Copy short URL
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            onOpen(shortUrl, 'Opened short URL');
          }}
        >
          <LinkIcon fontSize="small" sx={{ mr: 1 }} />
          Open short URL
        </MenuItem>
        <MenuItem
          onClick={() => {
            setAnchorEl(null);
            onOpen(destinationUrl, 'Opened destination');
          }}
        >
          <OpenInNewIcon fontSize="small" sx={{ mr: 1 }} />
          Open destination
        </MenuItem>
      </Menu>
    </Paper>
  );
}

const HistoryPage = () => {
  const [activeView, setActiveView] = useState('qr');
  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const deferredSearch = useDeferredValue(searchInput);
  const [sortKey, setSortKey] = useState('newest');
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [notice, setNotice] = useState('');
  const [noticeSeverity, setNoticeSeverity] = useState('success');

  useEffect(() => {
    setPage(1);
  }, [activeView, deferredSearch, sortKey, rowsPerPage]);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      setLoading(true);
      setError('');

      const config = VIEW_CONFIG[activeView];
      const sortConfig = getSortConfig(sortKey);
      const from = (page - 1) * rowsPerPage;
      const to = from + rowsPerPage - 1;

      let query = supabase
        .from(config.view)
        .select('*', { count: 'exact' })
        .filter('archived', 'not.is', 'true')
        .order(sortConfig.column, {
          ascending: sortConfig.ascending,
          ...(sortConfig.nullsFirst === undefined ? {} : { nullsFirst: sortConfig.nullsFirst }),
        })
        .range(from, to);

      const searchFilter = getSearchFilter(activeView, deferredSearch);
      if (searchFilter) {
        query = query.or(searchFilter);
      }

      const { data, count, error: queryError } = await query;

      if (cancelled) return;

      if (queryError) {
        setRows([]);
        setTotalCount(0);
        setError(queryError.message || 'Failed to load history.');
      } else {
        setRows(data || []);
        setTotalCount(count || 0);
      }

      setLoading(false);
    }

    loadHistory().catch((err) => {
      if (cancelled) return;
      setRows([]);
      setTotalCount(0);
      setError(err.message || 'Failed to load history.');
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [activeView, deferredSearch, page, rowsPerPage, sortKey]);

  const pageCount = useMemo(
    () => Math.max(1, Math.ceil(totalCount / rowsPerPage)),
    [rowsPerPage, totalCount]
  );

  const showNotice = (message, severity = 'success') => {
    setNotice(message);
    setNoticeSeverity(severity);
  };

  const handleCopy = async (text, successMessage) => {
    const copied = await copyText(text);
    showNotice(copied ? successMessage : 'Unable to copy value', copied ? 'success' : 'error');
  };

  const handleOpen = (url, successMessage) => {
    const opened = openLink(url);
    showNotice(opened ? successMessage : 'Link is not available', opened ? 'success' : 'error');
  };

  const handleDownloadPng = async (row) => {
    try {
      await downloadQrPng(row);
      showNotice('PNG download started');
    } catch (err) {
      showNotice(err.message || 'Unable to export PNG', 'error');
    }
  };

  const handleDownloadSvg = async (row) => {
    try {
      await downloadQrSvg(row);
      showNotice('SVG download started');
    } catch (err) {
      showNotice(err.message || 'Unable to export SVG', 'error');
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        sx={{ mb: 2 }}
      >
        <Typography variant="body2" color="text.secondary">
          Admin history for QR exports and short links
        </Typography>
      </Stack>

      <HistoryToolbar
        activeView={activeView}
        totalCount={totalCount}
        searchInput={searchInput}
        onSearchChange={setSearchInput}
        sortKey={sortKey}
        onSortChange={setSortKey}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={setRowsPerPage}
        onViewChange={setActiveView}
      />

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={1.5}>
        {!loading && rows.length === 0 && !error && (
          <Paper variant="outlined" sx={{ p: 5, borderRadius: 3, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ mb: 1 }}>
              No history found
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Try adjusting the search, sort, or record type filters.
            </Typography>
          </Paper>
        )}

        {rows.map((row) =>
          activeView === 'qr' ? (
            <QrHistoryRow
              key={row[VIEW_CONFIG.qr.idField]}
              row={row}
              onCopy={handleCopy}
              onOpen={handleOpen}
              onDownloadPng={handleDownloadPng}
              onDownloadSvg={handleDownloadSvg}
            />
          ) : (
            <ShortlinkHistoryRow
              key={row[VIEW_CONFIG.shortlink.idField]}
              row={row}
              onCopy={handleCopy}
              onOpen={handleOpen}
            />
          )
        )}
      </Stack>

      <Paper
        variant="outlined"
        sx={{
          mt: 2.5,
          p: 2,
          borderRadius: 3,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'stretch', md: 'center' },
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Typography variant="body2" color="text.secondary">
          Page {page} of {pageCount}
        </Typography>
        <Pagination
          color="primary"
          page={page}
          count={pageCount}
          onChange={(_, nextPage) => setPage(nextPage)}
        />
      </Paper>

      {loading && (
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <Paper
            elevation={4}
            sx={{ px: 2.5, py: 1.5, borderRadius: 999, display: 'flex', alignItems: 'center', gap: 1 }}
          >
            <CircularProgress size={18} />
            <Typography variant="body2">Loading history…</Typography>
          </Paper>
        </Box>
      )}

      <Snackbar
        open={Boolean(notice)}
        autoHideDuration={2400}
        onClose={() => setNotice('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setNotice('')} severity={noticeSeverity} variant="filled">
          {notice}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default HistoryPage;

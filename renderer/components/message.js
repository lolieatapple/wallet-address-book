import { Alert, Snackbar } from "@mui/material";
import { MONO_FONT } from "../theme";

const alertSx = {
  width: '100%',
  borderRadius: 0,
  fontFamily: MONO_FONT,
  fontSize: '0.78rem',
  letterSpacing: '0.03em',
  alignItems: 'center',
};

export function MessageBox(props) {
  const { successInfo, errorInfo, setErrorInfo, setSuccessInfo } = props;

  return (
    <>
      {successInfo !== '' && (
        <Snackbar
          open={successInfo !== ''}
          autoHideDuration={3000}
          onClose={() => setSuccessInfo('')}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setSuccessInfo('')}
            severity="success"
            variant="filled"
            sx={{
              ...alertSx,
              // Monochrome: ink bar on paper, no green
              bgcolor: 'text.primary',
              color: 'background.paper',
              '& .MuiAlert-icon': { color: 'inherit' },
            }}
          >
            {successInfo}
          </Alert>
        </Snackbar>
      )}

      {errorInfo && (
        <Snackbar
          open={!!errorInfo}
          autoHideDuration={4000}
          onClose={() => setErrorInfo && setErrorInfo('')}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setErrorInfo && setErrorInfo('')}
            severity="error"
            variant="filled"
            sx={alertSx}
          >
            {errorInfo}
          </Alert>
        </Snackbar>
      )}
    </>
  );
}

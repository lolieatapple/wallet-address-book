import { Alert, Snackbar, useTheme } from "@mui/material";

export function MessageBox(props) {
  const theme = useTheme();
  const { successInfo, errorInfo, setErrorInfo, setSuccessInfo } = props;
  
  return (
    <>
      {successInfo !== '' && (
        <Snackbar 
          open={successInfo !== ''} 
          autoHideDuration={3000} 
          onClose={() => setSuccessInfo('')}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          sx={{
            '& .MuiPaper-root': {
              borderRadius: 2,
              boxShadow: theme.palette.mode === 'dark' 
                ? '0 4px 20px rgba(0, 0, 0, 0.5)'
                : '0 4px 20px rgba(0, 0, 0, 0.15)'
            }
          }}
        >
          <Alert 
            onClose={() => setSuccessInfo('')} 
            severity="success" 
            variant="filled"
            sx={{ 
              width: '100%',
              fontWeight: 'medium',
              alignItems: 'center'
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
          sx={{
            '& .MuiPaper-root': {
              borderRadius: 2,
              boxShadow: theme.palette.mode === 'dark' 
                ? '0 4px 20px rgba(0, 0, 0, 0.5)'
                : '0 4px 20px rgba(0, 0, 0, 0.15)'
            }
          }}
        >
          <Alert 
            onClose={() => setErrorInfo && setErrorInfo('')} 
            severity="error" 
            variant="filled"
            sx={{ 
              width: '100%',
              fontWeight: 'medium',
              alignItems: 'center'
            }}
          >
            {errorInfo}
          </Alert>
        </Snackbar>
      )}
    </>
  );
}

import { Alert, Snackbar } from "@mui/material";


export function MessageBox(props) {
  const successInfo = props.successInfo;
  const errorInfo = props.errorInfo;
  const setErrorInfo = props.setErrorInfo;
  const setSuccessInfo = props.setSuccessInfo;
  return <div>
    {
      successInfo !== '' && <Snackbar open={successInfo !== ''} autoHideDuration={6000} onClose={()=>setSuccessInfo('')}>
        <Alert onClose={()=>setSuccessInfo('')} severity="success" sx={{ width: '100%' }}>
          {successInfo}
        </Alert>
      </Snackbar>
    }
  </div>
}

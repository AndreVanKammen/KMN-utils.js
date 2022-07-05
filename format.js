export function secondsToTimeStr(seconds) {
  // https://stackoverflow.com/questions/6312993/javascript-seconds-to-time-string-with-format-hhmmss
  var date = new Date(0);
  let sign = Math.sign(seconds);
  date.setSeconds(Math.abs(seconds)); // specify value for SECONDS here
  var timeString = date.toISOString().substr(11, 8);

  let ix = 0;
  while (ix < timeString.length-4) {
    let c = timeString.charAt(ix);
    if ((c !== '0') && (c !== ':')) {
      break;
    }
    ix++;
  }
  
  if (sign === -1) {
    return '-' + timeString.substring(ix);
  } else {
    return timeString.substring(ix);
  }
}

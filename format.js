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

export function byteLengthToStr(len) {
  let units = ['bytes','KB','MB','GB','TB','PB','EB'];
  let unitIx = 0; // Alternative: Math.floor(Math.log(len)*(1.0/Math.log(1024)))
  while (len >= 1000 && unitIx < units.length-1) {
    len /= 1024;
    unitIx++;
  }
  return len.toLocaleString(undefined, { maximumFractionDigits: 1 }) + units[unitIx];
}


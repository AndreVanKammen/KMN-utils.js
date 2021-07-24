
const svgNamespace = 'http://www.w3.org/2000/svg';
const svgIcon = (pathData, w, h) => {
  const element = document.createElementNS(svgNamespace, 'svg');
  w = w || 20;
  h = h || 20;
  element.classList.add('icon');
  // element.setAttribute('xmlns', svgNamespace);
  element.setAttribute('width', w);
  element.setAttribute('height', h);
  element.setAttribute('viewbox', `2 2 ${(w+2)} ${(h+2)}`);

  const path = document.createElementNS(svgNamespace, 'path');
  path.setAttribute('d', pathData);

  element.appendChild(path);
  return element;
}

export default svgIcon;
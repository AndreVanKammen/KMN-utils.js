// Copyright by André van Kammen
// Licensed under CC BY-NC-SA 
// https://creativecommons.org/licenses/by-nc-sa/4.0/

let retinaDisabled = false
export function disableRetina(val) {
  retinaDisabled = val;
}
let vertexIDWorkaroundBuffer = null;
let currentShader = null;
let currentShaderSize = {
  w: 1024, h: 512
}
let ignoreClipRect = false;
let currentClipElement = null;

const defaultTextureInfo = { texture: undefined, size: 0, bufferWidth: 1024 };

export const shaderOptions = {
  vertexIDDisabled: false
}
export function disableVertexID(val) {
  shaderOptions.vertexIDDisabled = val;
}
export function getVertexIDDiabled(val) {
  return shaderOptions.vertexIDDisabled;
}

const uniformSetters = new (function() {
  const t = this;
  t.f = function(fnc, UL, gl) {
    const ul = UL;
    const g = gl;
    return function(x, y, z, w) {
      g["uniform" + fnc](ul, x, y, z, w);
    };
  };
  t.m = function(fnc, UL, gl) {
    const ul = UL;
    const g = gl;
    return function(x) {
      g["uniformMatrix" + fnc](ul, false, x);
    };
  };
  t[0x8b50] = t.f.bind(t, "2f");
  t[0x8b51] = t.f.bind(t, "3f");
  t[0x8b52] = t.f.bind(t, "4f");
  t[0x8b57] = t[0x8b53] = t.f.bind(this, "2i");
  t[0x8b58] = t[0x8b54] = t.f.bind(this, "3i");
  t[0x8b59] = t[0x8b55] = t.f.bind(this, "4i");
  t[0x8b5a] = t.m.bind(t, "2fv");
  t[0x8b5b] = t.m.bind(t, "3fv");
  t[0x8b5c] = t.m.bind(t, "4fv");
  t[0x8b56] = t[0x8b5e] = t[0x8b60] = t[0x1400] = t[0x1401] = t[0x1402] = t[0x1403] = t[0x1404] = t[0x1405] = t.f.bind(
    t,
    "1i"
  );
  t[0x1406] = t.f.bind(t, "1f");
})();



/**
 * @typedef {WebGLProgram & {u:any,a:any}} WebGLProgramExtOld
 */

/**
 * @typedef {{
 *   set: (x:number, y?:number, z?:number, w?:number) => {},
 *   en: () => void,
 *   dis: () => void
 * }} UniformSetter
 */

export class WebGLProgramExt {
  /** @type {Record<string, UniformSetter>} */
  u;
  /** @type {Record<string, UniformSetter>} */
  a;
  lastVertStr = '';
  lastFragStr = '';
}

/** @type {Record<string,WebGLProgramExt>} */
let webGLPrograms = {};
export class RenderingContextWithUtils extends WebGL2RenderingContext {

  /**
   * 
   * @param {string} shaderId 
   * @param {string} vertStr 
   * @param {string} fragStr 
   * @returns {WebGLProgramExt}
   */
   checkUpdateShader(shaderId, vertStr, fragStr) {
    let shader = webGLPrograms[shaderId];
    if (!shader ||
        (vertStr !== shader.lastVertStr) ||
        (fragStr !== shader.lastFragStr)) {
      shader = this.getShaderProgram(
        vertStr,
        fragStr,
        2);
      console.log('Shader loaded: ', shaderId);
      shader.lastVertStr = vertStr;
      shader.lastFragStr = fragStr;
      webGLPrograms[shaderId] = shader;
    }
    return shader;
  }

  /**
   * 
   * @param {string} shaderId 
   * @param {(options)=>String} vertFunc 
   * @param {(options)=>String} fragFunc 
   * @returns {WebGLProgramExt}
   */
   checkUpdateShader2(shaderId, vertFunc, fragFunc) {
     let shader = webGLPrograms[shaderId];
     let vertStr = vertFunc(shaderOptions);
     let fragStr = fragFunc(shaderOptions);
    if (!shader ||
        (vertStr !== shader.lastVertStr) ||
        (fragStr !== shader.lastFragStr)) {
      shader = this.getShaderProgram(
        vertStr,
        fragStr,
        2);
      console.log('Shader loaded: ', shaderId);
      shader.lastVertStr = vertStr;
      shader.lastFragStr = fragStr;
      webGLPrograms[shaderId] = shader;
    }
    return shader;
  }

  updateCanvasSize(canvas) {
    let dpr = devicePixelRatio;
    if (retinaDisabled) {
      dpr = Math.min(dpr, 1);
    }
    let w = canvas.offsetWidth * dpr;
    let h = canvas.offsetHeight * dpr;
    if (w !== canvas.width ||
        h !== canvas.height) {
      canvas.width = w;
      canvas.height = h;
    }

    return { w, h, dpr };
  }

  setIgnoreClipRect(value) {
    ignoreClipRect = value;
  }

  updateShaderAndSize(obj, shader, parentElement, clipElement = null) {
    // TODO: This needs to be cleared after every frame!
    if (true) { //currentShader !== shader || (clipElement !== currentClipElement && !ignoreClipRect)) {
      currentShader = shader;
      currentClipElement = clipElement;

      let { w, h, dpr } = this.updateCanvasSize(this.canvas);
      let ch = h;
      let rect = parentElement.getBoundingClientRect();
      if (rect.width && rect.height) {
        this.viewport(rect.x * dpr, h - (rect.y + rect.height) * dpr, rect.width * dpr, rect.height * dpr);
        obj.width = w = rect.width * dpr;
        obj.height = h = rect.height * dpr;

        this.bindFramebuffer(this.FRAMEBUFFER, null);
        this.useProgram(shader);

        shader.u.windowSize?.set(w, h);
        shader.u.dpr?.set(dpr);
      }

      if (!ignoreClipRect) {
        if (clipElement) {
          let clipRect = clipElement.getBoundingClientRect();
          this.scissor(clipRect.x * dpr,
            ch - (clipRect.y + clipElement.clientHeight) * dpr,
            clipElement.clientWidth * dpr,
            clipElement.clientHeight * dpr);
          this.enable(this.SCISSOR_TEST);
        } else {
          this.disable(this.SCISSOR_TEST);
        }
      }
  
      currentShaderSize = { w, h };
      return w > 0 && h > 0;
    } else {
      let size = currentShaderSize;
      obj.width = size.w;
      obj.height = size.h;
      return size.w > 0 && size.h > 0;
    }
  }

  getShader(str, shaderType, webGLVer) {
    const sdr = this.createShader(shaderType);
    if (~~webGLVer === 2) {      
      this.shaderSource(sdr, '#version 300 es\n' + str);
    } else {
      this.shaderSource(sdr, str);
    }
    this.compileShader(sdr);
    if (!this.getShaderParameter(sdr, this.COMPILE_STATUS)) {
      const m = /ERROR: [\d]+:([\d]+): (.+)/gim.exec(
        this.getShaderInfoLog(sdr)
      );
      console.log(this.getShaderInfoLog(sdr));
      let lines = str.split("\n");
      let lineNr = ~~m[1] - 1;
      console.log(
        'shadererror "[' + m[1] +
          ']\r\n   ' + lines[lineNr-1] +
          '\r\n>>>' + lines[lineNr] +
          '\r\n   ' + lines[lineNr+1] +
          "\r\n" + m[2]
      );
    }
    return sdr;
  }
  getCompileInfo(str, shaderType, webGLVer) {
    /** @type {WebGLProgramExt} */ // @ts-expect-error
    const sdr = this.createShader(shaderType);
    if (~~webGLVer === 2) {
      str = '#version 300 es\n' + str
    } 
    this.shaderSource(sdr, str);
    let start = globalThis.performance.now();
    this.compileShader(sdr);
    let stop = globalThis.performance.now();
    let shaderLog = '';
    let compileStatus = this.getShaderParameter(sdr, this.COMPILE_STATUS)
    if(!compileStatus) {
      shaderLog = this.getShaderInfoLog(sdr);
    }
    // let shaderSource = this.getShaderSource(sdr);

    return {
      compileStatus,
      compileTime: stop-start,
      gl: this,
      shader: sdr,
      shaderSource: str,
      shaderLog
    };
  }
  loadUniforms(shaderProgram) {
    shaderProgram.u = {};
    shaderProgram.a = {};
    const uniformCount = this.getProgramParameter(
      shaderProgram,
      this.ACTIVE_UNIFORMS
    );
    for (let i = 0; i < uniformCount; ++i) {
      const uniformInfo = this.getActiveUniform(shaderProgram, i);
      const uniformLoc = this.getUniformLocation(
        shaderProgram,
        uniformInfo.name
      );
      shaderProgram.u[uniformInfo.name] = uniformLoc;
      if (Object.hasOwnProperty.call(uniformSetters, uniformInfo.type)) {
        shaderProgram.u[uniformInfo.name].set = uniformSetters[
          uniformInfo.type
        ](uniformLoc, this);
      }
    }
    const attribCount = this.getProgramParameter(
      shaderProgram,
      this.ACTIVE_ATTRIBUTES
    );
    for (let i = 0; i < attribCount; ++i) {
      const attribInfo = this.getActiveAttrib(shaderProgram, i);
      const attribLoc = this.getAttribLocation(shaderProgram, attribInfo.name);

      // eslint-disable-next-line no-new-wrappers
      shaderProgram.a[attribInfo.name] = new Number(attribLoc); // IT NEEDS TO BE A NUMBER OBJECT, I DO THAT ON PURPOSE
      shaderProgram.a[attribInfo.name].set = (function(gl, AL) {
        return function(buffer, size) {
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
          gl.vertexAttribPointer(AL, size, gl.FLOAT, false, 0, 0);
        };
      })(this, attribLoc);
      shaderProgram.a[attribInfo.name].seti = (function(gl, AL) {
        return function(buffer, size) {
          gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
          gl.vertexAttribPointer(AL, size, gl.INT, false, 0, 0);
        };
      })(this, attribLoc);
      shaderProgram.a[attribInfo.name].en = (function(gl, AL) {
        return function() {
          gl.enableVertexAttribArray(AL);
        };
      })(this, attribLoc);
      shaderProgram.a[attribInfo.name].dis = (function(gl, AL) {
        return function() {
          gl.disableVertexAttribArray(AL);
        };
      })(this, attribLoc);
    }
  }
  /**
   * @param {string} vertexShader 
   * @param {string} fragmentShader 
   * @param {number} webGLVer 
   * @returns {WebGLProgramExt}
   */
  getShaderProgram(vertexShader, fragmentShader, webGLVer) {
    const shaderProgram = this.createProgram();
    this.attachShader(
      shaderProgram,
      this.getShader(vertexShader, this.VERTEX_SHADER, webGLVer)
    );
    this.attachShader(
      shaderProgram,
      this.getShader(fragmentShader, this.FRAGMENT_SHADER, webGLVer)
    );
    this.linkProgram(shaderProgram);
    this.loadUniforms(shaderProgram);
    // @ts-ignore
    return shaderProgram;
  }
  floatArray(data, dynamic) {
    const b = this.createBuffer();
    this.bindBuffer(this.ARRAY_BUFFER, b);
    if (!(data instanceof Float32Array)) {
      data = new Float32Array(data);
    }
    this.bufferData(
      this.ARRAY_BUFFER,
      data,
      dynamic ? this.DYNAMIC_DRAW : this.STATIC_DRAW
    );
    return b;
  }
  texParamNearestClamp(target) {
    this.texParameteri(target, this.TEXTURE_MIN_FILTER, this.NEAREST);
    this.texParameteri(target, this.TEXTURE_MAG_FILTER, this.NEAREST);
    this.texParameteri(target, this.TEXTURE_WRAP_S, this.CLAMP_TO_EDGE);
    this.texParameteri(target, this.TEXTURE_WRAP_T, this.CLAMP_TO_EDGE);
  }

  /**
   * 
   * @param {Float32Array} buffer - The buffer to create the texture with
   * @param {typeof defaultTextureInfo} textureInfo - Is filled with information for tracking the texture
   */
  deleteFloat32TextureBuffer(buffer, textureInfo = { ...defaultTextureInfo }) {
    if (textureInfo.texture) {
      this.deleteTexture(textureInfo.texture);
    }
    if (buffer) {
      // Can't dispose float32buffer, it's owne bij our caller anyway
      buffer = null;
    }
  }
  /**
   * This functions needs buffers with a size that is a multiple of 4096
   * TODO: Refactor for other sizes and partial update
   * @param {Float32Array} buffer - The buffer to create the texture with
   * @param {typeof defaultTextureInfo} textureInfo - Is filled with information for tracking the texture
   */
  createOrUpdateFloat32TextureBuffer(buffer, textureInfo = { ...defaultTextureInfo }, firstChange = -1,lastChange= -1) {
    let width = textureInfo.bufferWidth || 1024;
    // this.activeTexture(this.TEXTURE2);
    if (buffer.length % (4 * width) !== 0) {
      console.error('createOrUpdateFloat32TextureBuffer needs a multiple of '+ ~~(width * 4) +' as bufferSize!')
    }

    let size = buffer.length / 4;
    let w = width;
    let h = ~~(size / width);
    if (size < width) {
      w = size;
      h = 1;
    }

    let texture = textureInfo.texture;
    if (!texture || textureInfo.size !== size) {
      if (textureInfo.size>0) {
        this.deleteTexture(texture);
      }
      textureInfo.size = size;
      texture = textureInfo.texture = this.createTexture();
      this.bindTexture(this.TEXTURE_2D, texture);

      this.texImage2D(this.TEXTURE_2D, 0,
        this.RGBA32F,
        w, h, 0,
        this.RGBA,
        this.FLOAT, buffer);

      this.texParamNearestClamp(this.TEXTURE_2D);
    } else {
      this.bindTexture(this.TEXTURE_2D, texture);
      if (firstChange !== -1 && lastChange !== -1) {
        let firstRow = ~~(firstChange / 4 / width);
        let lastRow = ~~((lastChange + (width*4-1)) / 4 / width);

        this.texSubImage2D(this.TEXTURE_2D, 0, 0, firstRow, w, lastRow - firstRow,
          this.RGBA, this.FLOAT, buffer, firstRow * width * 4);

      } else {
        this.texSubImage2D(this.TEXTURE_2D, 0, 0, 0, w, h,
          this.RGBA, this.FLOAT, buffer);
      }
    }
    // this.activeTexture(this.TEXTURE0);
    return textureInfo
  }
  updateOrCreateFloatArray(b, data, copyLength) {
    const doCreate = !b;
    if (doCreate) {
      b = this.createBuffer();
    }
    if (!(data instanceof Float32Array)) {
      data = new Float32Array(data);
    }
    this.bindBuffer(this.ARRAY_BUFFER, b);
    if (doCreate) {
      this.bufferData(this.ARRAY_BUFFER, data, this.DYNAMIC_DRAW);
    } else {
      this.bufferSubData(this.ARRAY_BUFFER, 0, data, 0, copyLength || data.length);
    }
    return b;
  }
  updateOrCreateInt32Array(b, data) {
    const doCreate = !b
    if (doCreate) {
      b = this.createBuffer()
    }
    if (!(data instanceof Int32Array)) {
      data = new Int32Array(data)
    }
    this.bindBuffer(this.ARRAY_BUFFER, b)
    if (doCreate) { 
      this.bufferData(this.ARRAY_BUFFER, data, this.DYNAMIC_DRAW) 
    } else { 
      this.bufferSubData(this.ARRAY_BUFFER, 0, data) 
    }
    return b
  }
  updateOrCreateUInt32ElementArray(b, data) {
    const doCreate = !b
    if (doCreate) {
      b = this.createBuffer()
    }
    if (!(data instanceof Uint32Array)) {
      data = new Uint32Array(data)
    }
    this.bindBuffer(this.ELEMENT_ARRAY_BUFFER, b)
    if (doCreate) { 
      this.bufferData(this.ELEMENT_ARRAY_BUFFER, data, this.DYNAMIC_DRAW) 
    } else { 
      this.bufferSubData(this.ELEMENT_ARRAY_BUFFER, 0, data) 
    }
    return b
  }
  staticElementArray(data) {
    const b = this.createBuffer();
    if (!(data instanceof Uint16Array)) {
      data = new Uint16Array(data);
    }
    this.bindBuffer(this.ELEMENT_ARRAY_BUFFER, b);
    this.bufferData(
      this.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(data),
      this.STATIC_DRAW
    );
    return b;
  }
  /**
   * Makes an int array GL buffer with 1,2,3, etc because Vertex_ID is unstable on Mac (Retina 5K, Late 2015) AMD Radeon R9 M395X 4 GB
   * I use this as a vertex buffer to circumvent that problem
   * @returns {WebGLBuffer} 
   */
  getVertex_IDWorkaroundBuffer() {
    if (!vertexIDWorkaroundBuffer) {
      const maxVertexID = 1024 * 1024 * 4;
      let data = new Float32Array(maxVertexID); // Can't get Int to work on my mac :( Vertex shader input type does not match the type of the bound vertex attribute. int
  
      for (let ix = 0; ix < maxVertexID; ix++) {
        data[ix] = ix;
      }
      vertexIDWorkaroundBuffer = this.createBuffer();
      this.bindBuffer(this.ARRAY_BUFFER, vertexIDWorkaroundBuffer)
      this.bufferData(this.ARRAY_BUFFER, data, this.STATIC_READ);
    }
    return vertexIDWorkaroundBuffer;
  }
  loadCanvas(canvas, texNum) {
    const gl = this;
    const texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + ~~texNum);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return texture;
  }
  loadMipmap(src, callback) {
    const gl = this;
    const texture = gl.createTexture();
    const image = new globalThis.Image();
    image.crossOrigin = "anonymous";
    image.onload = function() {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        image
      );
      gl.generateMipmap(gl.TEXTURE_2D);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(
        gl.TEXTURE_2D,
        gl.TEXTURE_MIN_FILTER,
        gl.LINEAR_MIPMAP_LINEAR
      );
      gl.bindTexture(gl.TEXTURE_2D, null);
      if (callback) {
        callback(texture);
      }
    };
    image.src = src;
    return texture;
  }
  loadFromImage(image, texture) {
    const gl = this;
    const tex = texture || gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    // gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.bindTexture(gl.TEXTURE_2D, null);
    return tex;
  }
  loadImage(src, callback, texNum, scale) {
    const gl = this;
    const image = new globalThis.Image();
    gl.activeTexture(gl.TEXTURE0 + ~~texNum);
    const texture = gl.createTexture();
    image.onload = function() {
      gl.activeTexture(gl.TEXTURE0 + ~~texNum);
      if (scale) {
        image.width = image.width * scale;
        image.height = image.height * scale;
      }
      gl.loadFromImage(image, texture);
      callback(texture, image);
    };
    image.src = src;
  }
  isWebGL2 = true
}

/**
 * @returns {RenderingContextWithUtils}
 */
function AddUtilsToContext(ctx) {
  // @ts-ignore
  if (!ctx.__contextExtendedWithUtils) {
    for (let prop of Object.getOwnPropertyNames(RenderingContextWithUtils.prototype)) {
      if (prop !== 'constructor') {
        if (ctx.hasOwnProperty(prop)) {
          console.error('Conflicting util function: ', prop);
        } else {
          ctx[prop] = RenderingContextWithUtils.prototype[prop];
        }
      }
    }
    // @ts-ignore
    ctx.__contextExtendedWithUtils = true;
  }
  // @ts-ignore
  return ctx;
}

/**
 * Get's a webgl(2) context extended with utilities
 * @param {HTMLCanvasElement} canvas 
 * @param {WebGLContextAttributes} options 
 * @returns {RenderingContextWithUtils}
 */
export default function getWebGLContext(canvas, options = null) {
  const opt = options || { alpha: false };
  let glCtx;
  const contextNames = [
    "webgl2",
    "experimental-webgl2",
    "webgl",
    "experimental-webgl",
    "webkit-3d",
    "moz-webgl"
  ];
  for (let i = 0; i < contextNames.length; i++) {
    glCtx = canvas.getContext(contextNames[i], opt);
    if (glCtx) {
      // @ts-ignore
      glCtx.isWebGL2 = contextNames[i].endsWith('2');
      // @ts-ignore
      return AddUtilsToContext(glCtx);
    }
  }
}

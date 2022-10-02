// Copyright by André van Kammen
// Licensed under CC BY-NC-SA
// https://creativecommons.org/licenses/by-nc-sa/4.0/

const defaultTextureInfo = { texture: undefined, size: 0, bufferWidth: 1024 };

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
export class RenderingContextWithUtils extends WebGL2RenderingContext {

  getShader(str, shaderType, webGLVer) {
    const gl = this;
    const sdr = gl.createShader(shaderType);
    if (~~webGLVer === 2) {
      gl.shaderSource(sdr, '#version 300 es\n' + str);
    } else {
      gl.shaderSource(sdr, str);
    }
    gl.compileShader(sdr);
    if (!gl.getShaderParameter(sdr, gl.COMPILE_STATUS)) {
      const m = /ERROR: [\d]+:([\d]+): (.+)/gim.exec(
        gl.getShaderInfoLog(sdr)
      );
      console.log(gl.getShaderInfoLog(sdr));
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
    const gl = this;
    /** @type {WebGLProgramExt} */ // @ts-expect-error
    const sdr = gl.createShader(shaderType);
    if (~~webGLVer === 2) {
      str = '#version 300 es\n' + str
    }
    gl.shaderSource(sdr, str);
    let start = globalThis.performance.now();
    gl.compileShader(sdr);
    let stop = globalThis.performance.now();
    let shaderLog = '';
    let compileStatus = gl.getShaderParameter(sdr, gl.COMPILE_STATUS)
    if(!compileStatus) {
      shaderLog = gl.getShaderInfoLog(sdr);
    }
    // let shaderSource = this.getShaderSource(sdr);

    return {
      compileStatus,
      compileTime: stop-start,
      gl: gl,
      shader: sdr,
      shaderSource: str,
      shaderLog
    };
  }
  loadUniforms(shaderProgram) {
    const gl = this;
    shaderProgram.u = {};
    shaderProgram.a = {};
    const uniformCount = gl.getProgramParameter(
      shaderProgram,
      gl.ACTIVE_UNIFORMS
    );
    for (let i = 0; i < uniformCount; ++i) {
      const uniformInfo = gl.getActiveUniform(shaderProgram, i);
      const uniformLoc = gl.getUniformLocation(
        shaderProgram,
        uniformInfo.name
      );
      shaderProgram.u[uniformInfo.name] = uniformLoc;
      if (Object.hasOwnProperty.call(uniformSetters, uniformInfo.type)) {
        if (!shaderProgram.u[uniformInfo.name]) {
          console.log('Error generatating uniform setter for: ', uniformInfo.name);
        } else {
          shaderProgram.u[uniformInfo.name].set = uniformSetters[
            uniformInfo.type
          ](uniformLoc, gl);
        }
      }
    }
    const attribCount = gl.getProgramParameter(
      shaderProgram,
      gl.ACTIVE_ATTRIBUTES
    );
    for (let i = 0; i < attribCount; ++i) {
      const attribInfo = gl.getActiveAttrib(shaderProgram, i);
      const attribLoc = gl.getAttribLocation(shaderProgram, attribInfo.name);

      // eslint-disable-next-line no-new-wrappers
      shaderProgram.a[attribInfo.name] = new Number(attribLoc); // IT NEEDS TO BE A NUMBER OBJECT, I DO THAT ON PURPOSE
      if (!shaderProgram.a[attribInfo.name]) {
        console.log('Error generatating attribute setter for: ', attribInfo.name);
      } else {
        shaderProgram.a[attribInfo.name].set = (function (gl, AL) {
          return function (buffer, size) {
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.vertexAttribPointer(AL, size, gl.FLOAT, false, 0, 0);
          };
        })(gl, attribLoc);
        shaderProgram.a[attribInfo.name].seti = (function (gl, AL) {
          return function (buffer, size) {
            gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
            gl.vertexAttribPointer(AL, size, gl.INT, false, 0, 0);
          };
        })(gl, attribLoc);
        shaderProgram.a[attribInfo.name].en = (function (gl, AL) {
          return function () {
            gl.enableVertexAttribArray(AL);
          };
        })(gl, attribLoc);
        shaderProgram.a[attribInfo.name].dis = (function (gl, AL) {
          return function () {
            gl.disableVertexAttribArray(AL);
          };
        })(gl, attribLoc);
      }
    }
  }
  /**
   * @param {string} vertexShader
   * @param {string} fragmentShader
   * @param {number} webGLVer
   * @returns {WebGLProgramExt}
   */
  getShaderProgram(vertexShader, fragmentShader, webGLVer) {
    const gl = this;
    const shaderProgram = gl.createProgram();
    gl.attachShader(
      shaderProgram,
      gl.getShader(vertexShader, gl.VERTEX_SHADER, webGLVer)
    );
    gl.attachShader(
      shaderProgram,
      gl.getShader(fragmentShader, gl.FRAGMENT_SHADER, webGLVer)
    );
    gl.linkProgram(shaderProgram);
    gl.loadUniforms(shaderProgram);
    // @ts-ignore
    return shaderProgram;
  }
  floatArray(data, dynamic) {
    const gl = this;
    const b = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    if (!(data instanceof Float32Array)) {
      data = new Float32Array(data);
    }
    gl.bufferData(
      gl.ARRAY_BUFFER,
      data,
      dynamic ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW
    );
    return b;
  }
  texParamNearestClamp(target) {
    const gl = this;
    gl.texParameteri(target, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(target, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(target, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(target, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  /**
   *
   * @param {Float32Array} buffer - The buffer to create the texture with
   * @param {typeof defaultTextureInfo} textureInfo - Is filled with information for tracking the texture
   */
  deleteFloat32TextureBuffer(buffer, textureInfo = { ...defaultTextureInfo }) {
    const gl = this;
    if (textureInfo.texture) {
      gl.deleteTexture(textureInfo.texture);
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
    const gl = this;
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
        gl.deleteTexture(texture);
      }
      textureInfo.size = size;
      texture = textureInfo.texture = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, texture);

      gl.texImage2D(gl.TEXTURE_2D, 0,
        gl.RGBA32F,
        w, h, 0,
        gl.RGBA,
        gl.FLOAT, buffer);

      gl.texParamNearestClamp(gl.TEXTURE_2D);
    } else {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      if (firstChange !== -1 && lastChange !== -1) {
        let firstRow = ~~(firstChange / 4 / width);
        let lastRow = ~~((lastChange + (width*4-1)) / 4 / width);

        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, firstRow, w, lastRow - firstRow,
          gl.RGBA, gl.FLOAT, buffer, firstRow * width * 4);

      } else {
        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, w, h,
          gl.RGBA, gl.FLOAT, buffer);
      }
    }
    // this.activeTexture(this.TEXTURE0);
    return textureInfo
  }
  updateOrCreateFloatArray(b, data, copyLength) {
    const gl = this;
    const doCreate = !b;
    if (doCreate) {
      b = gl.createBuffer();
    }
    if (!(data instanceof Float32Array)) {
      data = new Float32Array(data);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, b);
    if (doCreate) {
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
    } else {
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, data, 0, copyLength || data.length);
    }
    return b;
  }
  updateOrCreateInt32Array(b, data) {
    const gl = this;
    const doCreate = !b
    if (doCreate) {
      b = gl.createBuffer()
    }
    if (!(data instanceof Int32Array)) {
      data = new Int32Array(data)
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, b)
    if (doCreate) {
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW)
    } else {
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, data)
    }
    return b
  }
  updateOrCreateUInt32ElementArray(b, data) {
    const gl = this;
    const doCreate = !b
    if (doCreate) {
      b = gl.createBuffer()
    }
    if (!(data instanceof Uint32Array)) {
      data = new Uint32Array(data)
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b)
    if (doCreate) {
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, data, gl.DYNAMIC_DRAW)
    } else {
      gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, data)
    }
    return b
  }
  staticElementArray(data) {
    const gl = this;
    const b = gl.createBuffer();
    if (!(data instanceof Uint16Array)) {
      data = new Uint16Array(data);
    }
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, b);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(data),
      gl.STATIC_DRAW
    );
    return b;
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
  const opt = {
    alpha: false,
    antialias: false,
    depth: false,
    desynchronized: true,
    failIfMajorPerformanceCaveat: false,
    powerPreference: "high-performance",
    premultipliedAlpha: false,
    preserveDrawingBuffer: false,
    stencil: false,
     ...options
  };
  let glCtx;
  const contextNames = [
    "webgl2",
    "experimental-webgl2",
    "webgl",
    "experimental-webgl",
    "webkit-3d",
    "moz-webgl"
  ];
  console.log('Webgl options:', opt);
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

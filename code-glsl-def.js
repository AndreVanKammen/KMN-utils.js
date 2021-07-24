// Copyright by André van Kammen
// Licensed under CC BY-NC-SA 
// https://creativecommons.org/licenses/by-nc-sa/4.0/

// https://docs.nvidia.com/drive/active/5.1.6.0L/nvvib_docs/DRIVE_OS_Linux_SDK_Development_Guide/baggage/GLSL_ES_Specification_3.00.4.pdf
// Section 3.6 keywords
const GLSLWords = {
  pre_process: {
    '#ifdef':1,
    '#if':1,
    '#elif':1,
    '#endif':1,
    '#define':1
  },
  reserved: {
    define: 1,
    precision: 1,
    varying: 1,
    uniform: 1,
    layout: 1, // What does this do
    highp: 1,
    mediump: 1,
    lowp: 1,

    if: 3,
    else: 3,
    do: 3,
    for: 3,
    while: 3,
    break: 3,
    continue: 4,
    return: 4,
    discard: 4,
    switch: 5,
    case: 5,
    default: 5,

    // TODO: what do these do?
    invariant: 6,
    centroid: 6,
    flat: 6, 
    smooth: 6,

    // These are basicly type modifiers
    const: 2,
    in: 2,
    out: 2,
    inout: 2,

    void: 10,
  },
  reserved_type: {
    struct: 10,
    float: 10,
    int: 10,
    uint: 10,
    bool: 10
  },
  const: {
    true: 1, 
    false: 1
  },
  type: {
    vec2:  3, vec3:  3, vec4:  3,
    bvec2: 3, bvec3: 3, bvec4: 3,
    ivec2: 3, ivec3: 3, ivec4: 3,
    uvec2: 3, uvec3: 3, uvec4: 3,
    mat2: 4, mat3:4 ,mat4:4,
    "mat2x2":5, "mat2x3":5, "mat2x4":5,
    "mat3x2":5, "mat3x3":5, "mat3x4":5,
    "mat4x2":5, "mat4x3":5, "mat4x4":5,

    // Not all of these are webgl(2) available I guess but added them anyway
    // Since they might be in the future
    sampler1D: 6,
    sampler2D: 6,
    sampler3D: 6,
    samplerCube: 6,
    sampler2DRect: 6,
    sampler1DArray: 6,
    sampler2DArray: 6,
    samplerCubeArray: 6,
    sampler2DMS: 6,
    sampler2DMSArray: 6

    // All the types above are alos available wit (g,u,i) prefix and some with shadow suffix, but not in WebGL for now
  },
  function: {
    // TODO not complete?
    isampler2D:1,
    isampler3D:1,
    isamplerCube:1,
    isampler2DArray:1,

    radians: 2,
    degrees: 2,

    sin:2,   cos:2,   tan:2,
    asin:2,  acos:2,  atan:2,    
    sinh:2,  cosh:2,  tanh:2,
    asinh:2, acosh:2, atanh:2,

    pow: 3,
    exp: 3,
    log: 3,
    exp2: 3,
    log2: 3,
    sqrt: 3,
    inversesqrt: 3,

    abs:4,
    sign:4,
    floor:4,
    trunc:4,
    round:4,
    roundEven:4,
    ceil:4,
    fract:4,

    mod: 5,
    modf: 5,
    min: 5,
    max: 5,
    clamp: 5,
    mix: 5,
    step: 5,
    smoothstep: 5,
    isnan: 5,
    isinf: 5,

    length: 6,
    distance: 6,
    dot: 6,
    cross: 6,
    normalize: 6,
    faceforward: 6,
    reflect: 6,
    refract: 6,

    floatBitsToInt: 7,
    floatBitsToUInt: 7,
    intBitsToFloat: 7,
    uintBitsToFloat: 7,
    packSnorm2x16: 7,
    unpackSnorm2x16: 7,
    packUnorm2x16: 7,
    unpackUnorm2x16: 7,
    packHalf2x16: 7,
    unpackHalf2x16: 7,
    
    matrixCompMult: 8,
    outerProduct: 8,
    transpose: 8,
    determinant: 8,
    inverse: 8,

    lessThan: 9,
    lessThanEqual: 9,
    greaterThan: 9,
    greaterThanEqual: 9,
    equal: 9,
    notEqual: 9,
    any: 9,
    all: 9,
    not: 9,

    textureSize:10,
    texture:10,
    textureProj:10,
    textureLod:10,
    textureOffset:10,
    texelFetch:10,
    texelFetchOffset:10,
    textureProjOffset:10,
    textureLodOffset:10,
    textureProjLod:10,
    textureProjLodOffset:10,
    textureGrad:10,
    textureGradOffset:10,
    textureProjGrad:10,
    textureProjGradOffset:10,

    dFdx:11,
    dFdy:11,
    fwidth:11
  },
  
  other: {
    attribute:1,
    coherent:1,
    volatile:1,
    restrict:1,
    readonly:1,
    writeonly:1,
    resource:1,
    atomic_uint:1,
    noperspective:1,
    patch:1,
    sample:1,
    subroutine:1,
    common:1,
    partition:1, 
    active:1,
    asm:1,
    class:1,
    union:1,
    enum:1,
    typedef:1,
    template:1,
    this:1,
    goto:1,
    inline:1,
    noinline:1,
    public:1,
    static:1,
    extern:1,
    external:1,
    interface:1,
    long:1,
    short:1,
    double:1,
    half:1,
    fixed:1,
    unsigned:1,
    superp:1,
    input:1, output:1,
    hvec2:1, hvec3:1, hvec4:1,
    dvec2:1, dvec3:1, dvec4:1,
    fvec2:1, fvec3:1, fvec4:1,
    sampler3DRect:1,
    filter:1,
    image1D:1,
    image2D:1,
    image3D:1,
    imageCube:1,
    iimage1D:1,
    iimage2D:1,
    iimage3D:1,
    iimageCube:1,
    uimage1D:1,
    uimage2D:1,
    uimage3D:1,
    uimageCube:1,
    image1DArray:1,
    image2DArray:1,
    iimage1DArray:1,
    iimage2DArray:1,
    uimage1DArray:1,
    uimage2DArray:1,
    image1DShadow:1,
    image2DShadow:1,
    image1DArrayShadow:1,
    image2DArrayShadow:1,
    imageBuffer:1,
    iimageBuffer:1,
    uimageBuffer:1,
    sampler1D:1,
    sampler1DShadow:1,
    sampler1DArray:1,
    sampler1DArrayShadow:1,
    isampler1D:1,
    isampler1DArray:1,
    usampler1D:1,
    usampler1DArray:1,
    sampler2DRect:1,
    sampler2DRectShadow:1,
    isampler2DRect:1,
    usampler2DRect:1,
    samplerBuffer:1,
    isamplerBuffer:1,
    usamplerBuffer:1,
    sampler2DMS:1,
    isampler2DMS:1,
    usampler2DMS:1,
    sampler2DMSArray:1,
    isampler2DMSArray:1,
    usampler2DMSArray:1,
    sizeof:1,
    cast:1,
    namespace:1,
    using:1,
  }
};

const GLSLSymbols = {
  ";": {type:';'},
  ",": {type:','},
  // "#": {type:'#'},
  "(": {type:'('},
  ")": {type:')'},
  "{": {type:'('},
  "}": {type:')'},
  "[": {type:'('},
  "]": {type:')'},
  "*": {type:'*'},
  "+": {type:'*'},
  "-": {type:'*'},
  "++": {type:'*'},
  "--": {type:'*'},
  "/": {type:'*'},
  "%": {type:'*'},
  "!": {type:'*'},
  "=": {type:'='},
  "+=": {type:'='},
  "-=": {type:'='},
  "*=": {type:'='},
  "/=": {type:'='},
  "&&": {type:'&'},
  "||": {type:'&'},
  "==": {type:'&'},
  "!=": {type:'&'},
  ">=": {type:'&'},
  "<=": {type:'&'},
  ">": {type:'&'},
  "<": {type:'&'},
  "~": {type:'&'},
  "?": {type:'&'},
  ":": {type:'&'},
  "&": {type:'!'},
  "|": {type:'!'},
  "^": {type:'!'},
  ">>": {type:'!'},
  "<<": {type:'!'},
  "/*": {type:'/'},
  "*/": {type:'/'},
  "//": {type:'/'}
}
/* 
From ShaderToy
Version: WebGL 2.0
Arithmetic: ( ) + - ! * / % 
Logical/Relatonal: ~ < > <= >= == != && ||
Bit Operators: & ^ | << >>
Comments: // /* * /
Types: void bool int uint float vec2 vec3 vec4 bvec2 bvec3 bvec4 ivec2 ivec3 ivec4 uvec2 uvec3 uvec4 mat2 mat3 mat4 mat?x? sampler2D, sampler3D, samplerCube
Format: float a = 1.0; int b = 1; uint i = 1U; int i = 0x1;
Function Parameter Qualifiers: [none], in, out, inout
Global Variable Qualifiers: const
Vector Components: .xyzw .rgba .stpq
Flow Control: if else for return break continue switch/case
Output: vec4 fragColor
Input: vec2 fragCoord
Preprocessor: # #define #undef #if #ifdef #ifndef #else #elif #endif #error #pragma #line
*/
export default { words:GLSLWords, symbols:GLSLSymbols }
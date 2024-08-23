// Get the WebGL context
const canvas = document.getElementById('webgl-canvas');
const gl = canvas.getContext('webgl');

if (!gl) {
    alert('WebGL not supported in your browser!');
    throw new Error('WebGL not supported');
}

// Enable depth testing
gl.enable(gl.DEPTH_TEST);

// Vertex shader program
const vertexShaderSource = `
    attribute vec4 aVertexPosition;
    attribute vec4 aVertexColor;
    attribute vec2 aTextureCoord;
    
    uniform mat4 uModelViewMatrix;
    uniform mat4 uProjectionMatrix;
    
    varying highp vec4 vColor;
    varying highp vec2 vTextureCoord;
    
    void main() {
        gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
        vColor = aVertexColor;
        vTextureCoord = aTextureCoord;
    }
`;

// Fragment shader program
const fragmentShaderSource = `
    precision mediump float;
    
    varying highp vec4 vColor;
    varying highp vec2 vTextureCoord;
    
    uniform sampler2D uSampler;
    uniform bool uUseTexture;
    
    void main() {
        if (uUseTexture) {
            gl_FragColor = texture2D(uSampler, vTextureCoord);
        } else {
            gl_FragColor = vColor;
        }
    }
`;

// Initialize a shader program
function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
        return null;
    }

    return shaderProgram;
}

// Create a shader
function loadShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

// Initialize shader program
const shaderProgram = initShaderProgram(gl, vertexShaderSource, fragmentShaderSource);

// Collect all the info needed to use the shader program
const programInfo = {
    program: shaderProgram,
    attribLocations: {
        vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
        vertexColor: gl.getAttribLocation(shaderProgram, 'aVertexColor'),
        textureCoord: gl.getAttribLocation(shaderProgram, 'aTextureCoord'),
    },
    uniformLocations: {
        projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
        modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
        uSampler: gl.getUniformLocation(shaderProgram, 'uSampler'),
        uUseTexture: gl.getUniformLocation(shaderProgram, 'uUseTexture'),
    },
};

// Create textures for each face with letters
function createTextTexture(gl, letter, color) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // Create a canvas to draw the letter
    const textCanvas = document.createElement('canvas');
    textCanvas.width = 256;
    textCanvas.height = 256;
    const ctx = textCanvas.getContext('2d');

    // Fill with face color
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, textCanvas.width, textCanvas.height);

    // Draw the letter
    ctx.fillStyle = 'white';
    ctx.font = 'bold 160px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(letter, textCanvas.width / 2, textCanvas.height / 2);

    // Upload the canvas as a texture
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textCanvas);
    
    // Set texture parameters
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    return texture;
}

// Create textures for each face
const faceTextures = [
    createTextTexture(gl, 'A', 'red'),        // Red face
    createTextTexture(gl, 'B', 'orange'),     // Orange face
    createTextTexture(gl, 'C', 'yellow'),     // Yellow face
    createTextTexture(gl, 'D', 'green'),      // Green face
    createTextTexture(gl, 'E', 'blue'),       // Blue face
    createTextTexture(gl, 'F', 'purple')      // Purple face
];

// Positions for the vertices of a cube
function initBuffers(gl) {
    // Create a buffer for the cube's vertex positions
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    // Cube vertices - 8 corners
    const positions = [
        // Front face
        -1.0, -1.0,  1.0,
         1.0, -1.0,  1.0,
         1.0,  1.0,  1.0,
        -1.0,  1.0,  1.0,
        
        // Back face
        -1.0, -1.0, -1.0,
        -1.0,  1.0, -1.0,
         1.0,  1.0, -1.0,
         1.0, -1.0, -1.0,
        
        // Top face
        -1.0,  1.0, -1.0,
        -1.0,  1.0,  1.0,
         1.0,  1.0,  1.0,
         1.0,  1.0, -1.0,
        
        // Bottom face
        -1.0, -1.0, -1.0,
         1.0, -1.0, -1.0,
         1.0, -1.0,  1.0,
        -1.0, -1.0,  1.0,
        
        // Right face
         1.0, -1.0, -1.0,
         1.0,  1.0, -1.0,
         1.0,  1.0,  1.0,
         1.0, -1.0,  1.0,
        
        // Left face
        -1.0, -1.0, -1.0,
        -1.0, -1.0,  1.0,
        -1.0,  1.0,  1.0,
        -1.0,  1.0, -1.0
    ];

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    // Set up the colors for each face of the cube
    const faceColors = [
        [1.0, 0.0, 0.0, 1.0],    // Red - front face
        [1.0, 0.65, 0.0, 1.0],   // Orange - back face
        [1.0, 1.0, 0.0, 1.0],    // Yellow - top face
        [0.0, 1.0, 0.0, 1.0],    // Green - bottom face
        [0.0, 0.0, 1.0, 1.0],    // Blue - right face
        [0.5, 0.0, 0.5, 1.0]     // Purple - left face
    ];

    // Convert the array of colors into a table for all the vertices
    let colors = [];
    for (let j = 0; j < faceColors.length; j++) {
        const c = faceColors[j];
        // Repeat each color four times for the four vertices of the face
        colors = colors.concat(c, c, c, c);
    }

    const colorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

    // Texture coordinates buffer
    const textureCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, textureCoordBuffer);

    const textureCoordinates = [
        // Front
        0.0, 0.0,
        1.0, 0.0,
        1.0, 1.0,
        0.0, 1.0,
        // Back
        0.0, 0.0,
        1.0, 0.0,
        1.0, 1.0,
        0.0, 1.0,
        // Top
        0.0, 0.0,
        1.0, 0.0,
        1.0, 1.0,
        0.0, 1.0,
        // Bottom
        0.0, 0.0,
        1.0, 0.0,
        1.0, 1.0,
        0.0, 1.0,
        // Right
        0.0, 0.0,
        1.0, 0.0,
        1.0, 1.0,
        0.0, 1.0,
        // Left
        0.0, 0.0,
        1.0, 0.0,
        1.0, 1.0,
        0.0, 1.0
    ];

    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoordinates), gl.STATIC_DRAW);

    // Build the element array buffer - defines ordering of vertices in the cube
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);

    // This array defines each face as two triangles, using the
    // indices into the vertex array to specify each triangle's
    // position.
    const indices = [
        0, 1, 2,      0, 2, 3,    // front
        4, 5, 6,      4, 6, 7,    // back
        8, 9, 10,     8, 10, 11,  // top
        12, 13, 14,   12, 14, 15, // bottom
        16, 17, 18,   16, 18, 19, // right
        20, 21, 22,   20, 22, 23  // left
    ];

    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

    return {
        position: positionBuffer,
        color: colorBuffer,
        textureCoord: textureCoordBuffer,
        indices: indexBuffer,
    };
}

const buffers = initBuffers(gl);

// Rotation and position values
let rotationX = 0.0;
let rotationY = 0.0;
let rotationZ = 0.0;  // New rotation value for Z axis
let positionX = 0.0;
let positionY = 0.0;
let positionZ = -6.0; // Initialize Z position (was hardcoded at -6.0 before)

// Key state tracking
const keys = {
    ArrowLeft: false,
    ArrowRight: false,
    ArrowUp: false,
    ArrowDown: false,
    w: false,
    a: false,
    s: false,
    d: false,
    W: false,
    A: false,
    S: false,
    D: false,
    j: false,
    l: false,
    i: false,
    k: false,
    J: false,
    L: false,
    I: false,
    K: false
};

// Add touch variables
let touchStartX = 0;
let touchStartY = 0;
let previousTouchDistance = 0;
let isTouching = false;

// Event listeners for keyboard controls
window.addEventListener('keydown', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = true;
        // Prevent default behavior for these keys (like scrolling)
        e.preventDefault();
    }
});

window.addEventListener('keyup', (e) => {
    if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = false;
    }
});

// Touch event handlers for mobile devices
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevent default behavior like scrolling
    isTouching = true;
    
    if (e.touches.length === 1) {
        // Single touch - for rotation (swipe)
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
        // Two touches - for pinch (zoom)
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        previousTouchDistance = Math.sqrt(dx * dx + dy * dy);
    }
}, false);

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    
    if (!isTouching) return;
    
    if (e.touches.length === 1) {
        // Handle swipe for rotation
        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;
        
        // Calculate how much the touch has moved
        const deltaX = touchX - touchStartX;
        const deltaY = touchY - touchStartY;
        
        // Apply rotation based on swipe direction
        rotationY += deltaX * 0.005;
        rotationX += deltaY * 0.005;
        
        // Update touch start position
        touchStartX = touchX;
        touchStartY = touchY;
    } else if (e.touches.length === 2) {
        // Handle pinch for Z-axis movement
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const currentTouchDistance = Math.sqrt(dx * dx + dy * dy);
        
        // Compare with previous distance to determine pinch direction
        const pinchDelta = currentTouchDistance - previousTouchDistance;
        
        // Move on Z axis based on pinch
        positionZ += pinchDelta * 0.01;
        
        // Update previous distance
        previousTouchDistance = currentTouchDistance;
    }
}, false);

canvas.addEventListener('touchend', (e) => {
    // Reset touch state when user lifts finger(s)
    if (e.touches.length === 0) {
        isTouching = false;
    } else if (e.touches.length === 1) {
        // If one finger was lifted but another remains
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }
}, false);

canvas.addEventListener('touchcancel', (e) => {
    isTouching = false;
}, false);

// Update rotation and position based on key states
function updateCubePosition() {
    // Rotation controls
    if (keys.ArrowLeft) {
        rotationY -= 0.05;
    }
    if (keys.ArrowRight) {
        rotationY += 0.05;
    }
    if (keys.ArrowUp) {
        rotationX -= 0.05;
    }
    if (keys.ArrowDown) {
        rotationX += 0.05;
    }
    
    // New rotation controls - Z axis
    if (keys.j || keys.J) {
        rotationZ -= 0.05; // Counter-clockwise
    }
    if (keys.l || keys.L) {
        rotationZ += 0.05; // Clockwise
    }
    
    // Position controls
    if (keys.w || keys.W) {
        positionY += 0.05;
    }
    if (keys.s || keys.S) {
        positionY -= 0.05;
    }
    if (keys.a || keys.A) {
        positionX -= 0.05;
    }
    if (keys.d || keys.D) {
        positionX += 0.05;
    }
    
    // New position controls - Z axis
    if (keys.i || keys.I) {
        positionZ += 0.1; // Move towards viewer
    }
    if (keys.k || keys.K) {
        positionZ -= 0.1; // Move away from viewer
    }
}

// Draw the scene
function drawScene(gl, programInfo, buffers, deltaTime) {
    // Resize canvas to full window
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    gl.clearColor(1.0, 1.0, 1.0, 1.0);  // Clear to white
    gl.clearDepth(1.0);                 // Clear everything
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Create a perspective projection matrix
    const fieldOfView = 45 * Math.PI / 180;   // in radians
    const aspect = canvas.width / canvas.height;
    const zNear = 0.1;
    const zFar = 100.0;
    const projectionMatrix = mat4.create();

    mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

    // Set the drawing position to the "identity" point
    const modelViewMatrix = mat4.create();

    // Position the cube - use the variable instead of hardcoded value
    mat4.translate(modelViewMatrix, modelViewMatrix, [positionX, positionY, positionZ]);
    
    // Rotate the cube - add Z rotation
    mat4.rotate(modelViewMatrix, modelViewMatrix, rotationX, [1, 0, 0]);
    mat4.rotate(modelViewMatrix, modelViewMatrix, rotationY, [0, 1, 0]);
    mat4.rotate(modelViewMatrix, modelViewMatrix, rotationZ, [0, 0, 1]);

    // Tell WebGL how to pull out the positions from the position
    // buffer into the vertexPosition attribute
    {
        const numComponents = 3;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexPosition,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    }

    // Tell WebGL how to pull out the colors from the color buffer
    // into the vertexColor attribute
    {
        const numComponents = 4;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.color);
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexColor,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);
    }

    // Tell WebGL how to pull out the texture coordinates from
    // the texture coordinate buffer into the textureCoord attribute
    {
        const numComponents = 2;
        const type = gl.FLOAT;
        const normalize = false;
        const stride = 0;
        const offset = 0;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.textureCoord);
        gl.vertexAttribPointer(
            programInfo.attribLocations.textureCoord,
            numComponents,
            type,
            normalize,
            stride,
            offset);
        gl.enableVertexAttribArray(programInfo.attribLocations.textureCoord);
    }

    // Tell WebGL which indices to use to index the vertices
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

    // Tell WebGL to use our program when drawing
    gl.useProgram(programInfo.program);

    // Set the shader uniforms
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.projectionMatrix,
        false,
        projectionMatrix);
    gl.uniformMatrix4fv(
        programInfo.uniformLocations.modelViewMatrix,
        false,
        modelViewMatrix);

    // Draw each face with its texture
    for (let i = 0; i < 6; i++) {
        // Bind the texture
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, faceTextures[i]);
        gl.uniform1i(programInfo.uniformLocations.uSampler, 0);
        gl.uniform1i(programInfo.uniformLocations.uUseTexture, 1);

        // Draw only the elements for this face (6 vertices per face)
        const vertexCount = 6;
        const offset = i * 6 * 2; // 6 vertices per face, 2 bytes per vertex
        const type = gl.UNSIGNED_SHORT;
        gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
    }
    
    // Draw the edges in black
    gl.uniform1i(programInfo.uniformLocations.uUseTexture, 0); // Don't use texture
    
    // Set the color to black for the lines
    const blackColor = [0.0, 0.0, 0.0, 1.0];
    const lineVerts = [
        // Front face
        -1.0, -1.0,  1.0,    1.0, -1.0,  1.0,
         1.0, -1.0,  1.0,    1.0,  1.0,  1.0,
         1.0,  1.0,  1.0,   -1.0,  1.0,  1.0,
        -1.0,  1.0,  1.0,   -1.0, -1.0,  1.0,
        
        // Back face
        -1.0, -1.0, -1.0,    1.0, -1.0, -1.0,
         1.0, -1.0, -1.0,    1.0,  1.0, -1.0,
         1.0,  1.0, -1.0,   -1.0,  1.0, -1.0,
        -1.0,  1.0, -1.0,   -1.0, -1.0, -1.0,
        
        // Connect front to back
        -1.0, -1.0,  1.0,   -1.0, -1.0, -1.0,
         1.0, -1.0,  1.0,    1.0, -1.0, -1.0,
         1.0,  1.0,  1.0,    1.0,  1.0, -1.0,
        -1.0,  1.0,  1.0,   -1.0,  1.0, -1.0
    ];
    
    // Create a buffer for the line vertices
    const lineBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lineVerts), gl.STATIC_DRAW);
    
    // Set the vertex attribute to use the line buffer
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexPosition,
        3,
        gl.FLOAT,
        false,
        0,
        0);
    
    // Create a buffer for line colors (all black)
    const lineColors = [];
    for (let i = 0; i < lineVerts.length / 3; i++) {
        lineColors.push(...blackColor);
    }
    
    const lineColorBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, lineColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lineColors), gl.STATIC_DRAW);
    
    // Set the color attribute to use the line color buffer
    gl.vertexAttribPointer(
        programInfo.attribLocations.vertexColor,
        4,
        gl.FLOAT,
        false,
        0,
        0);
    
    // Draw the lines
    gl.lineWidth(2.0); // Set line width
    gl.drawArrays(gl.LINES, 0, lineVerts.length / 3);
}

// Add the matrix library
function loadMatrixLibrary() {
    // mat4 implementation - simplified version of gl-matrix
    window.mat4 = {
        create: function() {
            return new Float32Array([
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1
            ]);
        },
        
        perspective: function(out, fovy, aspect, near, far) {
            const f = 1.0 / Math.tan(fovy / 2);
            out[0] = f / aspect;
            out[5] = f;
            out[10] = (far + near) / (near - far);
            out[11] = -1;
            out[14] = (2 * far * near) / (near - far);
            out[15] = 0;
            return out;
        },
        
        translate: function(out, a, v) {
            const x = v[0], y = v[1], z = v[2];
            
            out[0] = a[0]; out[1] = a[1]; out[2] = a[2]; out[3] = a[3];
            out[4] = a[4]; out[5] = a[5]; out[6] = a[6]; out[7] = a[7];
            out[8] = a[8]; out[9] = a[9]; out[10] = a[10]; out[11] = a[11];
            
            out[12] = a[0] * x + a[4] * y + a[8] * z + a[12];
            out[13] = a[1] * x + a[5] * y + a[9] * z + a[13];
            out[14] = a[2] * x + a[6] * y + a[10] * z + a[14];
            out[15] = a[3] * x + a[7] * y + a[11] * z + a[15];
            
            return out;
        },
        
        rotate: function(out, a, rad, axis) {
            let x = axis[0], y = axis[1], z = axis[2];
            
            let len = Math.sqrt(x * x + y * y + z * z);
            
            if (len < 0.000001) { return null; }
            
            len = 1 / len;
            x *= len;
            y *= len;
            z *= len;
            
            const s = Math.sin(rad);
            const c = Math.cos(rad);
            const t = 1 - c;
            
            // Calculate rotated matrix
            const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
            const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
            const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
            
            // Construct rotation matrix
            const b00 = x * x * t + c, b01 = y * x * t + z * s, b02 = z * x * t - y * s;
            const b10 = x * y * t - z * s, b11 = y * y * t + c, b12 = z * y * t + x * s;
            const b20 = x * z * t + y * s, b21 = y * z * t - x * s, b22 = z * z * t + c;
            
            // Perform rotation
            out[0] = a00 * b00 + a10 * b01 + a20 * b02;
            out[1] = a01 * b00 + a11 * b01 + a21 * b02;
            out[2] = a02 * b00 + a12 * b01 + a22 * b02;
            out[3] = a03 * b00 + a13 * b01 + a23 * b02;
            out[4] = a00 * b10 + a10 * b11 + a20 * b12;
            out[5] = a01 * b10 + a11 * b11 + a21 * b12;
            out[6] = a02 * b10 + a12 * b11 + a22 * b12;
            out[7] = a03 * b10 + a13 * b11 + a23 * b12;
            out[8] = a00 * b20 + a10 * b21 + a20 * b22;
            out[9] = a01 * b20 + a11 * b21 + a21 * b22;
            out[10] = a02 * b20 + a12 * b21 + a22 * b22;
            out[11] = a03 * b20 + a13 * b21 + a23 * b22;
            
            // If the source and destination differ, copy the unchanged last row
            if (a !== out) {
                out[12] = a[12];
                out[13] = a[13];
                out[14] = a[14];
                out[15] = a[15];
            }
            
            return out;
        }
    };
}

// Load our matrix implementation
loadMatrixLibrary();

// Initialize rotation animation
let then = 0;

// Main render loop
function render(now) {
    now *= 0.001;  // convert to seconds
    const deltaTime = now - then;
    then = now;

    // Update cube position based on keyboard input
    updateCubePosition();
    
    // Draw the scene
    drawScene(gl, programInfo, buffers, deltaTime);

    // Request another frame
    requestAnimationFrame(render);
}

// Handle window resize
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
});

// Start animation
requestAnimationFrame(render); 
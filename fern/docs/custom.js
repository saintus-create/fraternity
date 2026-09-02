(() => {
  const init = () => {
    const mount = document.getElementById('fraternity-entry');
    if (!mount || mount.dataset.initialized) return;
    mount.dataset.initialized = 'true';
    document.body.classList.add('fraternity-landing-active');

    const canvas = document.createElement('canvas');
    canvas.className = 'fraternity-webgl';
    canvas.setAttribute('aria-hidden', 'true');
    mount.appendChild(canvas);

    const gl = canvas.getContext('webgl', { antialias: true, alpha: false });
    if (!gl) return;

    const vertex = `
      attribute vec2 a_position;
      uniform float u_time;
      uniform vec2 u_resolution;
      uniform vec2 u_pointer;
      varying float v_alpha;
      void main() {
        vec2 p = a_position;
        float t = u_time * 0.00022;
        float r = length(p);
        float a = atan(p.y, p.x);
        float drift = sin(a * 5.0 + t * 7.0 + r * 8.0) * 0.018;
        drift += cos(a * 9.0 - t * 5.0) * 0.009;
        p *= 1.0 + drift;
        p += (u_pointer - 0.5) * 0.018 * (1.0 - min(r, 1.0));
        gl_Position = vec4(p, 0.0, 1.0);
        gl_PointSize = 1.6 + 1.8 * (1.0 - r);
        v_alpha = 0.18 + 0.55 * (1.0 - r);
      }
    `;
    const fragment = `
      precision mediump float;
      varying float v_alpha;
      void main() {
        vec2 q = gl_PointCoord - 0.5;
        float d = length(q);
        float glow = smoothstep(0.5, 0.0, d);
        gl_FragColor = vec4(0.62, 0.72, 1.0, glow * v_alpha);
      }
    `;

    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return null;
      return shader;
    };
    const vs = compile(gl.VERTEX_SHADER, vertex);
    const fs = compile(gl.FRAGMENT_SHADER, fragment);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const points = [];
    const count = 260;
    for (let i = 0; i < count; i++) {
      const radius = Math.pow(Math.random(), 0.72) * 0.98;
      const angle = Math.random() * Math.PI * 2;
      points.push(Math.cos(angle) * radius, Math.sin(angle) * radius);
    }
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.STATIC_DRAW);

    const position = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    const time = gl.getUniformLocation(program, 'u_time');
    const resolution = gl.getUniformLocation(program, 'u_resolution');
    const pointer = gl.getUniformLocation(program, 'u_pointer');
    const mouse = { x: 0.5, y: 0.5 };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    window.addEventListener('resize', resize, { passive: true });
    window.addEventListener('pointermove', (event) => {
      mouse.x = event.clientX / window.innerWidth;
      mouse.y = 1 - event.clientY / window.innerHeight;
    }, { passive: true });
    resize();

    const render = (now) => {
      if (!document.body.classList.contains('fraternity-landing-active')) return;
      gl.clearColor(0.025, 0.027, 0.035, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.uniform1f(time, now);
      gl.uniform2f(resolution, canvas.width, canvas.height);
      gl.uniform2f(pointer, mouse.x, mouse.y);
      gl.drawArrays(gl.POINTS, 0, count);
      requestAnimationFrame(render);
    };
    requestAnimationFrame(render);

    const interfaceLayer = document.createElement('div');
    interfaceLayer.className = 'fraternity-entry-ui';
    interfaceLayer.innerHTML = `
      <div class="fraternity-entry-mark">FRATERNITY & SORORITY<br>INCIDENT DATABASE</div>
      <button class="fraternity-enter" type="button" aria-label="Enter the documentation">ENTER</button>
    `;
    mount.appendChild(interfaceLayer);

    const enter = interfaceLayer.querySelector('.fraternity-enter');
    const proceed = () => {
      if (enter.disabled) return;
      enter.disabled = true;
      document.body.classList.add('fraternity-entering');
      window.setTimeout(() => {
        window.location.assign('/master-directory');
      }, 650);
    };
    enter.addEventListener('click', proceed);
    enter.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        proceed();
      }
    });
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();

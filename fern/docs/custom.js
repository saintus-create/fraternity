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

    const nodeVertex = `
      attribute vec2 a_position;
      attribute float a_size;
      attribute float a_alpha;
      varying float v_alpha;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        gl_PointSize = a_size;
        v_alpha = a_alpha;
      }
    `;
    const nodeFragment = `
      precision mediump float;
      varying float v_alpha;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        float glow = smoothstep(1.0, 0.0, d);
        gl_FragColor = vec4(0.70, 0.78, 1.0, glow * v_alpha);
      }
    `;
    const lineVertex = `
      attribute vec2 a_position;
      attribute float a_alpha;
      varying float v_alpha;
      void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_alpha = a_alpha;
      }
    `;
    const lineFragment = `
      precision mediump float;
      varying float v_alpha;
      void main() {
        gl_FragColor = vec4(0.46, 0.58, 0.92, v_alpha);
      }
    `;

    const compile = (type, source) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };
    const makeProgram = (vsSource, fsSource) => {
      const vs = compile(gl.VERTEX_SHADER, vsSource);
      const fs = compile(gl.FRAGMENT_SHADER, fsSource);
      if (!vs || !fs) return null;
      const program = gl.createProgram();
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
      return program;
    };

    const nodeProgram = makeProgram(nodeVertex, nodeFragment);
    const lineProgram = makeProgram(lineVertex, lineFragment);
    if (!nodeProgram || !lineProgram) return;

    const count = Math.min(190, Math.max(110, Math.floor((window.innerWidth * window.innerHeight) / 6500)));
    const nodes = Array.from({ length: count }, (_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.pow(Math.random(), 0.72) * 1.05;
      return {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        ox: Math.cos(angle) * radius,
        oy: Math.sin(angle) * radius,
        phase: Math.random() * Math.PI * 2,
        speed: 0.35 + Math.random() * 0.7,
        size: 2.0 + Math.random() * 2.6,
        alpha: 0.20 + Math.random() * 0.58,
      };
    });

    const nodeBuffer = gl.createBuffer();
    const lineBuffer = gl.createBuffer();
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

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
      mouse.tx = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.ty = 1 - (event.clientY / window.innerHeight) * 2;
    }, { passive: true });
    window.addEventListener('pointerleave', () => {
      mouse.tx = 0;
      mouse.ty = 0;
    }, { passive: true });
    resize();

    const drawNodes = (positions) => {
      const data = new Float32Array(count * 4);
      nodes.forEach((node, i) => {
        data[i * 4] = positions[i].x;
        data[i * 4 + 1] = positions[i].y;
        data[i * 4 + 2] = node.size;
        data[i * 4 + 3] = node.alpha;
      });
      gl.useProgram(nodeProgram);
      gl.bindBuffer(gl.ARRAY_BUFFER, nodeBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
      const position = gl.getAttribLocation(nodeProgram, 'a_position');
      const size = gl.getAttribLocation(nodeProgram, 'a_size');
      const alpha = gl.getAttribLocation(nodeProgram, 'a_alpha');
      gl.enableVertexAttribArray(position);
      gl.enableVertexAttribArray(size);
      gl.enableVertexAttribArray(alpha);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 16, 0);
      gl.vertexAttribPointer(size, 1, gl.FLOAT, false, 16, 8);
      gl.vertexAttribPointer(alpha, 1, gl.FLOAT, false, 16, 12);
      gl.drawArrays(gl.POINTS, 0, count);
    };

    const drawLines = (positions) => {
      const vertices = [];
      const threshold = window.innerWidth < 700 ? 0.27 : 0.23;
      for (let i = 0; i < count; i++) {
        for (let j = i + 1; j < count; j++) {
          const dx = positions[i].x - positions[j].x;
          const dy = positions[i].y - positions[j].y;
          const d = Math.hypot(dx, dy);
          if (d > threshold) continue;
          const alpha = (1 - d / threshold) * 0.18;
          vertices.push(
            positions[i].x, positions[i].y, alpha,
            positions[j].x, positions[j].y, alpha
          );
        }
      }
      if (!vertices.length) return;
      const data = new Float32Array(vertices);
      gl.useProgram(lineProgram);
      gl.bindBuffer(gl.ARRAY_BUFFER, lineBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
      const position = gl.getAttribLocation(lineProgram, 'a_position');
      const alpha = gl.getAttribLocation(lineProgram, 'a_alpha');
      gl.enableVertexAttribArray(position);
      gl.enableVertexAttribArray(alpha);
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 12, 0);
      gl.vertexAttribPointer(alpha, 1, gl.FLOAT, false, 12, 8);
      gl.drawArrays(gl.LINES, 0, vertices.length / 3);
    };

    const render = (now) => {
      if (!document.body.classList.contains('fraternity-landing-active')) return;
      const t = reducedMotion ? 0 : now * 0.00012;
      mouse.x += (mouse.tx - mouse.x) * 0.055;
      mouse.y += (mouse.ty - mouse.y) * 0.055;

      const positions = nodes.map((node) => {
        const wave = Math.sin(t * node.speed + node.phase);
        const wave2 = Math.cos(t * node.speed * 0.73 + node.phase * 1.7);
        let x = node.ox + wave * 0.018 + wave2 * 0.012;
        let y = node.oy + wave2 * 0.018 - wave * 0.012;
        const dx = mouse.x - x;
        const dy = mouse.y - y;
        const dist = Math.hypot(dx, dy);
        if (dist < 0.42) {
          const force = Math.pow(1 - dist / 0.42, 2) * 0.075;
          x -= dx * force;
          y -= dy * force;
        }
        return { x, y };
      });

      gl.clearColor(0.018, 0.020, 0.028, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      drawLines(positions);
      drawNodes(positions);
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
      window.setTimeout(() => window.location.assign('/master-directory'), 650);
    };
    enter.addEventListener('click', proceed);
    enter.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        proceed();
      }
    });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();

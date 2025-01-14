

(() => {
    // Optimized Simplex Noise implementation with cached constants
    class OptimizedSimplexNoise {
        constructor() {
            this.perm = new Uint8Array(512);
            this.permMod12 = new Uint8Array(512);
            
            // Pre-compute permutation table
            const p = new Uint8Array(256);
            for (let i = 0; i < 256; i++) p[i] = i;
            
            // Fisher-Yates shuffle
            for (let i = 255; i > 0; i--) {
                const r = (Math.random() * (i + 1)) | 0;
                [p[i], p[r]] = [p[r], p[i]];
            }
            
            // Duplicate for seamless wrapping
            for (let i = 0; i < 512; i++) {
                this.perm[i] = p[i & 255];
                this.permMod12[i] = this.perm[i] % 12;
            }
        }

        // Optimized 2D noise with fewer calculations
        noise2D(x, y) {
            const F2 = 0.5 * (Math.sqrt(3) - 1);
            const G2 = (3 - Math.sqrt(3)) / 6;
            
            const s = (x + y) * F2;
            const i = Math.floor(x + s);
            const j = Math.floor(y + s);
            
            const t = (i + j) * G2;
            const X0 = i - t;
            const Y0 = j - t;
            const x0 = x - X0;
            const y0 = y - Y0;
            
            const i1 = x0 > y0 ? 1 : 0;
            const j1 = x0 > y0 ? 0 : 1;
            
            const x1 = x0 - i1 + G2;
            const y1 = y0 - j1 + G2;
            const x2 = x0 - 1 + 2 * G2;
            const y2 = y0 - 1 + 2 * G2;
            
            const ii = i & 255;
            const jj = j & 255;
            
            const n0 = this.getCornerNoise(x0, y0, ii, jj);
            const n1 = this.getCornerNoise(x1, y1, ii + i1, jj + j1);
            const n2 = this.getCornerNoise(x2, y2, ii + 1, jj + 1);
            
            return 70 * (n0 + n1 + n2);
        }

        getCornerNoise(x, y, i, j) {
            const t = 0.5 - x * x - y * y;
            if (t < 0) return 0;
            const gi = this.permMod12[i + this.perm[j]];
            return t * t * t * t * this.dot(gi, x, y);
        }

        dot(gi, x, y) {
            return x * (gi & 1 ? 1 : -1) + y * (gi & 2 ? 1 : -1);
        }
    }

    // Initialize with optimal settings
    const canvas = document.getElementById('terrainCanvas');
    const ctx = canvas.getContext('2d', { alpha: false });
    const simplex = new OptimizedSimplexNoise();
    const width = 400;
    const height = 400;
    
    canvas.width = width;
    canvas.height = height;

    // Optimized 2D rendering with buffered operations
    function render2D() {
        const imageData = ctx.createImageData(width, height);
        const data = imageData.data;
        const scale = 20;
        
        // Pre-calculate offsets for optimization
        const offsets = new Float32Array(width);
        for (let x = 0; x < width; x++) {
            offsets[x] = x / scale;
        }

        // Batch process rows
        for (let y = 0; y < height; y++) {
            const yOffset = y / scale;
            const rowOffset = y * width * 4;
            
            for (let x = 0; x < width; x++) {
                const noise = simplex.noise2D(offsets[x], yOffset);
                const color = (noise + 1) * 128 | 0;
                const idx = rowOffset + x * 4;
                
                data[idx] = color;
                data[idx + 1] = color;
                data[idx + 2] = color;
                data[idx + 3] = 255;
            }
        }
        
        ctx.putImageData(imageData, 0, 0);
    }

    // Optimized 3D rendering with efficient geometry and materials
    let renderer, scene, camera, terrain;
    
    function initialize3D() {
        renderer = new THREE.WebGLRenderer({ antialias: false });
        renderer.setSize(width, height);
        renderer.setPixelRatio(1);
        
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(75, width / height, 1, 1000);
        
        const geometry = new THREE.PlaneGeometry(40, 40, 50, 50);
        const material = new THREE.MeshPhongMaterial({
            color: 0x228B22,
            wireframe: true,
            shininess: 0
        });
        
        terrain = new THREE.Mesh(geometry, material);
        terrain.rotation.x = -Math.PI / 2;
        
        scene.add(terrain);
        
        const light = new THREE.DirectionalLight(0xffffff, 1);
        light.position.set(1, 1, 1);
        scene.add(light);
        
        camera.position.set(0, 30, 50);
        camera.lookAt(0, 0, 0);
    }

    function render3D() {
        const container = document.getElementById('canvasContainer');
        container.innerHTML = '';
        
        if (!renderer) initialize3D();
        container.appendChild(renderer.domElement);
        
        // Update terrain vertices efficiently
        const positions = terrain.geometry.attributes.position.array;
        const scale = 20;
        
        for (let i = 0; i < positions.length; i += 3) {
            positions[i + 2] = simplex.noise2D(positions[i] / scale, positions[i + 1] / scale) * 5;
        }
        
        terrain.geometry.attributes.position.needsUpdate = true;
        
        // Efficient animation loop with RAF
        let frameId;
        function animate() {
            frameId = requestAnimationFrame(animate);
            terrain.rotation.z += 0.001;
            renderer.render(scene, camera);
        }
        
        animate();
        
        // Cleanup function
        return () => {
            cancelAnimationFrame(frameId);
            renderer.dispose();
        };
    }

    // Event listeners
    document.getElementById('render2DBtn').addEventListener('click', render2D);
    document.getElementById('render3DBtn').addEventListener('click', render3D);
    
    // Initial render
    render2D();
})();

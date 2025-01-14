import * as THREE from 'three';
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Water } from 'three/addons/objects/Water.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

class OptimizedSimplexNoise {
    constructor() {
        this.perm = new Uint8Array(512);
        this.permMod12 = new Uint8Array(512);
        const p = new Uint8Array(256);
        for (let i = 0; i < 256; i++) p[i] = i;
        for (let i = 255; i > 0; i--) {
            const r = (Math.random() * (i + 1)) | 0;
            [p[i], p[r]] = [p[r], p[i]];
        }
        for (let i = 0; i < 512; i++) {
            this.perm[i] = p[i & 255];
            this.permMod12[i] = this.perm[i] % 12;
        }
    }

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
        switch (gi % 3) {
            case 0: return x + y;
            case 1: return -x + y;
            case 2: return x - y;
            case 3: return -x - y;
            case 4: return x;
            case 5: return -x;
            case 6: return y;
            case 7: return -y;
            case 8: return x + y;
            case 9: return -x + y;
            case 10: return x - y;
            case 11: return -x - y;
            default: return 0;
        }
    }
}

class TerrainGenerator {
    constructor() {
        this.cameraNear = 0.1; // Set camera near value
        this.waterLevel = 0; // Initial water level
        this.simplex = new OptimizedSimplexNoise();
        this.setupMinimap();
        this.setupScene();
        this.setupLights();
        this.setupWater();
        this.generateTerrain();
        this.setupControls();
        this.setupInteractions();
        this.animate();
    }

    setupScene() {
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.getElementById('main-canvas'),
            antialias: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Optional: softer shadows
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb);
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, this.cameraNear, 2000);
        this.camera.position.set(50, 100, 100);
        this.camera.lookAt(0, 0, 0);
        window.addEventListener('resize', this.onWindowResize.bind(this), false);
    }

    setupLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
        this.scene.add(ambientLight);

        this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
        this.directionalLight.position.set(50, 200, 50);
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.width = 1024;
        this.directionalLight.shadow.mapSize.height = 1024;
        this.directionalLight.shadow.camera.near = 1;
        this.directionalLight.shadow.camera.far = 500;
        this.directionalLight.shadow.camera.left = -100;
        this.directionalLight.shadow.camera.right = 100;
        this.directionalLight.shadow.camera.top = 100;
        this.directionalLight.shadow.camera.bottom = -100;
        this.scene.add(this.directionalLight);
    }

    setupWater() {
        const waterGeometry = new THREE.PlaneGeometry(500, 500, 200, 200); // Increased segments for smoother waves
        this.water = new Water(
            waterGeometry,
            {
                textureWidth: 1024, // Higher resolution for better detail
                textureHeight: 1024,
                waterNormals: new THREE.TextureLoader().load('textures/waternormals.png', function (texture) {
                    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
                }),
                sunDirection: this.directionalLight.position.clone().normalize(),
                sunColor: 0xffffff,
                waterColor: 0x001e0f, // Keep a base color
                distortionScale: 3.7,
                fog: this.scene.fog !== undefined,
                alpha: 0.85, // Add some transparency for depth perception
                clipBias: THREE.MathUtils.clamp( 0.1 * ( this.cameraNear - this.waterLevel ), 0, 0.1 ) // Helps with clipping issues
            }
        );

        this.water.rotation.x = - Math.PI / 2;
        this.water.position.y = this.waterLevel; // Initial water level
        this.water.receiveShadow = true;
        this.scene.add(this.water);

        this.loadEnvironmentMap(); // Add environment mapping for realistic reflections
        this.animateWaterSurface(); // Implement subtle animation for more dynamic waves
    }

    loadEnvironmentMap() {
        new RGBELoader()
            .setPath('textures/environment/') // Path to your HDR environment maps
            .load('sunset.hdr', (texture) => {
                texture.mapping = THREE.EquirectangularReflectionMapping;
                this.scene.environment = texture; // Set as the scene environment
                this.water.material.envMap = texture; // Apply to the water material
            });
    }

    animateWaterSurface() {
        this.clock = new THREE.Clock();
    }

    setupMinimap() {
        this.minimapCanvas = document.getElementById('minimap');
        if (!this.minimapCanvas) {
            console.error('Minimap canvas not found');
            return;
        }
        this.minimapCtx = this.minimapCanvas.getContext('2d', { alpha: false });
        this.minimapCanvas.width = 200;
        this.minimapCanvas.height = 200;
    }

    setupControls() {
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.screenSpacePanning = false;
        this.controls.minDistance = 10;
        this.controls.maxDistance = 500;

        const controlsConfig = {
            scale: 'scale',
            height: 'height',
            resolution: 'resolution',
            octaves: 'octaves',
            persistence: 'persistence',
            lacunarity: 'lacunarity',
            'water-level': 'water-level'
        };

        for (const [key, id] of Object.entries(controlsConfig)) {
            const control = document.getElementById(id);
            if (control) {
                control.addEventListener('input', () => {
                    const valueElement = document.getElementById(`${key}-value`);
                    if (valueElement) {
                        valueElement.textContent = control.value;
                    }
                    this.updateTerrainGeometry();
                    if (key === 'water-level') {
                        this.updateWaterLevel();
                    }
                });
            }
        }

        const regenerateBtn = document.getElementById('regenerate');
        if (regenerateBtn) {
            regenerateBtn.addEventListener('click', () => {
                this.regenerateTerrain();
            });
        }

        const wireframeBtn = document.getElementById('toggle-wireframe');
        if (wireframeBtn) {
            wireframeBtn.addEventListener('click', () => {
                if (this.terrain) {
                    this.terrain.material.wireframe = !this.terrain.material.wireframe;
                }
            });
        }
    }

    setupInteractions() {
        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2();
        document.getElementById('main-canvas').addEventListener('pointerdown', this.onPointerDown.bind(this));
    }

    onPointerDown(event) {
        this.pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.pointer.y = - (event.clientY / window.innerHeight) * 2 + 1;

        this.raycaster.setFromCamera(this.pointer, this.camera);
        const intersects = this.raycaster.intersectObject(this.terrain);

        if (intersects.length > 0) {
            const point = intersects[0].point;
            this.modifyTerrain(point);
        }
    }

    modifyTerrain(point) {
        const brushSize = 5;
        const strength = 2;
        const positions = this.terrain.geometry.attributes.position.array;
        const vertex = new THREE.Vector3();

        for (let i = 0; i < positions.length; i += 3) {
            vertex.fromArray(positions, i);
            const distance = point.distanceTo(vertex);
            if (distance < brushSize) {
                const falloff = Math.cos(distance / brushSize * Math.PI / 2);
                positions[i + 2] += strength * falloff;
            }
        }
        this.terrain.geometry.attributes.position.needsUpdate = true;
        this.terrain.geometry.computeVertexNormals();
        this.updateMinimap();
    }

    generateTerrain() {
        const resolutionElement = document.getElementById('resolution');
        const resolution = resolutionElement ? parseInt(resolutionElement.value) : 100;
        const geometry = new THREE.PlaneGeometry(200, 200, resolution, resolution);
        this.terrain = new THREE.Mesh(geometry, this.createTerrainMaterial());
        this.terrain.rotation.x = -Math.PI / 2;
        this.terrain.receiveShadow = true;
        this.terrain.castShadow = true;
        if (this.scene.getObjectByName('terrain')) {
            this.scene.remove(this.scene.getObjectByName('terrain'));
        }
        this.terrain.name = 'terrain';
        this.scene.add(this.terrain);
        this.updateTerrainGeometry();
    }

    createTerrainMaterial() {
        return new THREE.MeshStandardMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
            wireframe: false,
            flatShading: true,
            vertexColors: true // Enable vertex coloring
        });
    }

    updateTerrainGeometry() {
        const scaleElement = document.getElementById('scale');
        const heightElement = document.getElementById('height');
        const octavesElement = document.getElementById('octaves');
        const persistenceElement = document.getElementById('persistence');
        const lacunarityElement = document.getElementById('lacunarity');

        const scale = scaleElement ? parseFloat(scaleElement.value) : 20;
        const heightScale = heightElement ? parseFloat(heightElement.value) : 5;
        const octaves = octavesElement ? parseInt(octavesElement.value) : 4;
        const persistence = persistenceElement ? parseFloat(persistenceElement.value) : 0.5;
        const lacunarity = lacunarityElement ? parseFloat(lacunarityElement.value) : 2;

        const geometry = this.terrain.geometry;
        const positions = geometry.attributes.position.array;
        const colors = new Float32Array(positions.length);

        for (let i = 0; i < positions.length; i += 3) {
            let x = positions[i];
            let y = positions[i + 1];
            let noiseSum = 0;
            let amplitude = 1;
            let frequency = 1;
            for (let o = 0; o < octaves; o++) {
                let noiseValue = this.simplex.noise2D(x / scale * frequency, y / scale * frequency);
                noiseSum += noiseValue * amplitude;
                amplitude *= persistence;
                frequency *= lacunarity;
            }
            const terrainHeight = noiseSum * heightScale;
            positions[i + 2] = terrainHeight;

            // Procedural texture generation based on height
            let color;
            if (this.water && terrainHeight < this.water.position.y) { // Deep water
                color = new THREE.Color(0x004488);
            } else if (this.water && terrainHeight < this.water.position.y + 1) { // Shallow water
                color = new THREE.Color(0x0088cc);
            } else if (terrainHeight < 5) { // Beach
                color = new THREE.Color(0xfaebd7);
            } else if (terrainHeight < 15) { // Grassland
                color = new THREE.Color(0x8FBC8F);
            } else if (terrainHeight < 25) { // Low mountains
                color = new THREE.Color(0xA9A9A9);
            } else { // High mountains
                color = new THREE.Color(0xFFFFFF);
            }
            colors[i] = color.r;
            colors[i + 1] = color.g;
            colors[i + 2] = color.b;
        }

        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();
        this.updateMinimap();
    }

    updateWaterLevel() {
        const waterLevelElement = document.getElementById('water-level');
        this.waterLevel = waterLevelElement ? parseFloat(waterLevelElement.value) : 0;
        if (this.water) {
            this.water.position.y = this.waterLevel;
            this.updateTerrainGeometry(); // Update terrain colors based on new water level
        }
    }

    updateMinimap() {
        if (!this.minimapCanvas || !this.minimapCtx || !this.terrain || !this.water) return;
        const width = this.minimapCanvas.width;
        const height = this.minimapCanvas.height;
        const imageData = this.minimapCtx.createImageData(width, height);
        const data = imageData.data;
        const positions = this.terrain.geometry.attributes.position.array;
        const resolutionElement = document.getElementById('resolution');
        const resolution = resolutionElement ? parseInt(resolutionElement.value) : 100;

        const terrainWidth = 200;
        const terrainDepth = 200;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const terrainX = (x / width) * terrainWidth - terrainWidth / 2;
                const terrainY = (y / height) * terrainDepth - terrainDepth / 2;

                let noiseSum = 0;
                let amplitude = 1;
                let frequency = 1;
                const scaleElement = document.getElementById('scale');
                const octavesElement = document.getElementById('octaves');
                const persistenceElement = document.getElementById('persistence');
                const lacunarityElement = document.getElementById('lacunarity');
                const scale = scaleElement ? parseFloat(scaleElement.value) : 20;
                const octaves = octavesElement ? parseInt(octavesElement.value) : 4;
                const persistence = persistenceElement ? parseFloat(persistenceElement.value) : 0.5;
                const lacunarity = lacunarityElement ? parseFloat(lacunarityElement.value) : 2;
                const heightElement = document.getElementById('height');
                const heightScale = heightElement ? parseFloat(heightElement.value) : 5;

                for (let o = 0; o < octaves; o++) {
                    let noiseValue = this.simplex.noise2D(terrainX / scale * frequency, terrainY / scale * frequency);
                    noiseSum += noiseValue * amplitude;
                    amplitude *= persistence;
                    frequency *= lacunarity;
                }
                const terrainHeight = noiseSum * heightScale;

                let color = [0, 0, 0];
                if (this.water && terrainHeight < this.water.position.y) {
                    color = [0, 68, 136];
                } else if (this.water && terrainHeight < this.water.position.y + 1) {
                    color = [0, 136, 204];
                } else if (terrainHeight < 5) {
                    color = [250, 235, 215];
                } else if (terrainHeight < 15) {
                    color = [143, 188, 143];
                } else if (terrainHeight < 25) {
                    color = [169, 169, 169];
                } else {
                    color = [255, 255, 255];
                }

                const idx = (y * width + x) * 4;
                data[idx] = color[0];
                data[idx + 1] = color[1];
                data[idx + 2] = color[2];
                data[idx + 3] = 255;
            }
        }
        this.minimapCtx.putImageData(imageData, 0, 0);
    }

    regenerateTerrain() {
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = 'block';
        }
        setTimeout(() => {
            this.simplex = new OptimizedSimplexNoise();
            this.generateTerrain();
            if (loading) {
                loading.style.display = 'none';
            }
        }, 100);
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        if (this.water && this.water.material.uniforms['time']) {
            this.water.material.uniforms['time'].value += 1.0 / 60.0;
        }
        this.renderer.render(this.scene, this.camera);
    }
}

window.addEventListener('load', () => {
    new TerrainGenerator();
});
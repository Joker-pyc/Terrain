
# Three.js Terrain and Water Simulation

This project is a real-time procedural terrain and water simulation using Three.js, a popular 3D JavaScript library. It features an optimized Simplex noise algorithm for terrain generation, interactive controls for customization, and realistic water rendering with reflections and dynamic waves.

## Features

- **Procedural Terrain Generation:** Utilizes an optimized Simplex noise algorithm to generate smooth, natural-looking terrains with customizable parameters like scale, height, octaves, persistence, and lacunarity.
- **Realistic Water Simulation:** Implements a `Water` object from Three.js examples to simulate water surfaces, complete with reflections, refractions, and dynamic wave motion.
- **Interactive Controls:**
    - Orbit controls for easy navigation around the scene.
    - Sliders and buttons in the UI to adjust terrain parameters and regenerate the terrain.
    - Toggleable wireframe mode to visualize the underlying mesh structure.
- **Terrain Modification:** Allows users to click on the terrain to raise its height, simulating simple terrain editing.
- **Minimap:** Includes a 2D minimap that provides an overview of the generated terrain with color-coded height representation.
- **Environment Mapping:** Uses HDR environment maps to enhance the realism of water reflections.
- **Performance Optimized:** Implements various techniques to ensure smooth performance, such as using typed arrays, optimizing noise generation, and providing options to adjust rendering resolution.

## Setup

To run this project locally, you'll need a web server. You can use a simple development server like `http-server` (for Node.js) or Live Server extension in VS Code.

1. **Clone the repository:**

   ```bash
   git clone https://github.com/Joker-pyc/Terrain.git
   cd Terrain
   ```

2. **Install dependencies:**

   This project uses Three.js and its addons (`OrbitControls`, `Water`, `RGBELoader`). You'll need to make sure these are available in your project. If you're using a package manager like npm or yarn, you can install them as follows:

   ```bash
   npm install three
   # or
   yarn add three
   ```

   Then, ensure that the addons are copied to your project's directory where they can be accessed. Usually under node_modules/three/examples/jsm
   If you are using ES6 import modules, you can import them directly, as seen in the code.

3. **Start a local server:**

   If you have `http-server` installed globally, navigate to your project directory and run:

   ```bash
   http-server
   ```

   Alternatively, if you're using VS Code, you can right-click on your `index.html` file and select "Open with Live Server."

4. **Open in your browser:**

   Open your web browser and go to `http://localhost:8080` (or the port indicated by your server).

## Usage

- **Navigation:** Use your mouse to rotate, pan, and zoom the camera around the scene.
- **Terrain Controls:**
    - Adjust the sliders in the left-side panel to modify the terrain's scale, height, resolution, octaves, persistence, and lacunarity.
    - Click the "Regenerate" button to create a new terrain with the current settings.
    - Click the "Toggle Wireframe" button to switch between solid and wireframe views.
    - Adjust the water level slider to change the water height.
- **Terrain Interaction:** Click on the terrain to raise the ground at the clicked point.
- **Minimap:** Observe the minimap in the top-right corner to get an overview of the terrain.

## Code Structure

- **`OptimizedSimplexNoise`:** A class implementing the Simplex noise algorithm for generating coherent noise patterns.
- **`TerrainGenerator`:** The main class that manages the scene, camera, lights, terrain, water, controls, and interactions.
    - `setupScene()`: Initializes the renderer, scene, and camera.
    - `setupLights()`: Sets up ambient and directional lights.
    - `setupWater()`: Creates the water object, sets its properties, and loads environment maps.
    - `loadEnvironmentMap()`: Loads an HDR environment map for realistic reflections.
    - `animateWaterSurface()`: Animates the water surface using a clock.
    - `setupMinimap()`: Initializes the minimap canvas.
    - `setupControls()`: Sets up orbit controls and UI event listeners.
    - `setupInteractions()`: Sets up raycasting for terrain interaction.
    - `onPointerDown()`: Handles pointer events for terrain modification.
    - `modifyTerrain()`: Modifies the terrain height based on user interaction.
    - `generateTerrain()`: Creates the terrain mesh with customizable resolution.
    - `createTerrainMaterial()`: Creates the material for the terrain.
    - `updateTerrainGeometry()`: Updates the terrain geometry based on noise and parameters.
    - `updateWaterLevel()`: Updates the water level based on the UI slider.
    - `updateMinimap()`: Redraws the minimap based on the current terrain.
    - `regenerateTerrain()`: Regenerates the terrain with new noise.
    - `onWindowResize()`: Handles window resize events.
    - `animate()`: The main animation loop that updates controls, animates water, and renders the scene.

## Dependencies

- **Three.js:** The core 3D library used for rendering the scene.
- **OrbitControls:** Provides camera controls for easy navigation.
- **Water:** A specialized shader from Three.js examples for rendering realistic water.
- **RGBELoader:** A loader for High Dynamic Range (HDR) environment maps.

## License

This project is licensed under the [MIT License](LICENSE) - see the LICENSE file for details.

## Acknowledgements

- The Three.js community for providing a powerful and versatile 3D library.
- The developers of the `Water` and `RGBELoader` addons.

## Contributing

Feel free to fork this project and submit pull requests for any improvements or bug fixes.

## Future Enhancements

- Implement more sophisticated terrain editing tools.
- Add vegetation and other details to the terrain.
- Improve water rendering with more advanced shaders.
- Optimize performance further for larger terrains.
- Implement a dynamic skybox.
- Add sound effects.
- Implement a day-night cycle.
- Add more control over the environment (e.g., fog, clouds).
- Add different biomes and terrain types.
- Make the terrain finite, with edges or a circular world.
- Save and load terrain data.

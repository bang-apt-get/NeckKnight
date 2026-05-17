// src/gameView3D.js

window.GameView3D = (function() {
  let scene, camera, renderer, animationId;
  let heroMesh, enemyMesh;
  let arenaGroup;

  // Animation state
  let heroAttacking = false;
  let enemyAttacking = false;
  let heroAttackTime = 0;
  let enemyAttackTime = 0;

  let floatingTexts = [];

  const THEME_ACCENT = 0x7aa2f7;

  function init(containerId, heroType) {
    const container = document.getElementById(containerId);
    if (!container) return;

    // Clear previous if any
    container.innerHTML = '';

    // Scene
    scene = new THREE.Scene();

    // Camera
    const aspect = container.clientWidth / container.clientHeight;
    // fallback aspect if clientWidth/clientHeight are 0
    const finalAspect = aspect || 1;
    camera = new THREE.PerspectiveCamera(60, finalAspect, 0.1, 1000);
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    // Use container dimensions, default to 400x400 if 0
    renderer.setSize(container.clientWidth || 400, container.clientHeight || 400);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(THEME_ACCENT, 0.5);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    // Arena Floor (Low poly floating island)
    arenaGroup = new THREE.Group();
    scene.add(arenaGroup);

    const floorGeo = new THREE.CylinderGeometry(5, 4, 1, 8);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x414868, roughness: 0.8 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.5;
    floor.receiveShadow = true;
    arenaGroup.add(floor);

    // Build Hero
    heroMesh = createHero(heroType);
    heroMesh.position.set(-2, 0, 0);
    scene.add(heroMesh);

    // Build Enemy (Goblin by default)
    enemyMesh = createEnemy('goblin');
    enemyMesh.position.set(2, 0, 0);
    scene.add(enemyMesh);

    // Handle Window Resize
    window.addEventListener('resize', onWindowResize);

    // Ensure size is correct right after init if container was hidden and shown
    setTimeout(onWindowResize, 50);

    // Start Loop
    animate();
  }

  function createHero(type) {
    const group = new THREE.Group();

    if (type === 'wizard') {
      // Wizard: Violet robed cylinders, glowing staff sphere
      const bodyGeo = new THREE.CylinderGeometry(0.3, 0.5, 1.5, 8);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x8a2be2 }); // violet
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.75;
      body.castShadow = true;
      group.add(body);

      const headGeo = new THREE.SphereGeometry(0.35, 8, 8);
      const headMat = new THREE.MeshStandardMaterial({ color: 0xffccaa });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.y = 1.7;
      head.castShadow = true;
      group.add(head);

      const staffGeo = new THREE.CylinderGeometry(0.05, 0.05, 2, 8);
      const staffMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
      const staff = new THREE.Mesh(staffGeo, staffMat);
      staff.position.set(0.6, 1, 0.5);
      staff.rotation.x = Math.PI / 8;
      staff.castShadow = true;
      group.add(staff);

      const orbGeo = new THREE.SphereGeometry(0.2, 16, 16);
      const orbMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.5 });
      const orb = new THREE.Mesh(orbGeo, orbMat);
      orb.position.set(0.6, 2, 0.6);
      group.add(orb);

    } else if (type === 'slime') {
      // Slime: Translucent bouncy green sphere
      const bodyGeo = new THREE.SphereGeometry(0.8, 16, 16);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        transparent: true,
        opacity: 0.8,
        roughness: 0.1
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 0.8;
      body.scale.y = 0.8;
      body.castShadow = true;
      group.add(body);

    } else {
      // Knight (default): Metallic silver blocks
      const bodyGeo = new THREE.BoxGeometry(1, 1.5, 0.8);
      const armorMat = new THREE.MeshStandardMaterial({ color: 0xc0c0c0, metalness: 0.8, roughness: 0.2 });
      const body = new THREE.Mesh(bodyGeo, armorMat);
      body.position.y = 0.75;
      body.castShadow = true;
      group.add(body);

      const headGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6);
      const head = new THREE.Mesh(headGeo, armorMat);
      head.position.y = 1.8;
      head.castShadow = true;
      group.add(head);

      // Sword
      const swordGroup = new THREE.Group();
      const bladeGeo = new THREE.BoxGeometry(0.1, 1.2, 0.2);
      const bladeMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 1.0, roughness: 0.1 });
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.position.y = 0.6;
      swordGroup.add(blade);

      const hiltGeo = new THREE.BoxGeometry(0.4, 0.1, 0.3);
      const hiltMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
      const hilt = new THREE.Mesh(hiltGeo, hiltMat);
      swordGroup.add(hilt);

      swordGroup.position.set(0.7, 1, 0.5);
      swordGroup.rotation.x = Math.PI / 4;
      group.add(swordGroup);

      group.userData.sword = swordGroup;
    }

    // Store original color for flash effect
    group.traverse((child) => {
      if (child.isMesh && child.material) {
        // Handle materials that could be arrays (though we didn't use them)
        const mat = Array.isArray(child.material) ? child.material[0] : child.material;
        child.userData.originalColor = mat.color.getHex();
      }
    });

    return group;
  }

  function createEnemy(type) {
    const group = new THREE.Group();
    // Goblin: Smaller dark-green aggressive jagged mesh
    const bodyGeo = new THREE.ConeGeometry(0.6, 1.2, 4);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x006400, roughness: 0.9 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.6;
    body.castShadow = true;
    group.add(body);

    const headGeo = new THREE.DodecahedronGeometry(0.4);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.y = 1.4;
    head.castShadow = true;
    group.add(head);

    return group;
  }

  function onWindowResize() {
    if (!camera || !renderer) return;
    const container = renderer.domElement.parentElement;
    if (!container) return;

    // Skip if width/height is 0
    if (container.clientWidth === 0 || container.clientHeight === 0) return;

    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }

  function animate() {
    animationId = requestAnimationFrame(animate);

    // Floating text animation
    for (let i = floatingTexts.length - 1; i >= 0; i--) {
      const textObj = floatingTexts[i];
      textObj.sprite.position.y += 0.02;
      textObj.life -= 0.02;
      textObj.sprite.material.opacity = textObj.life;
      if (textObj.life <= 0) {
        scene.remove(textObj.sprite);
        if (textObj.sprite.material.map) {
          textObj.sprite.material.map.dispose();
        }
        textObj.sprite.material.dispose();
        floatingTexts.splice(i, 1);
      }
    }

    // Hero Attack Animation
    if (heroAttacking && heroMesh) {
      heroAttackTime += 0.1;
      // Simple swing forward and back
      heroMesh.position.x = -2 + Math.sin(heroAttackTime) * 1.5;
      if (heroMesh.userData.sword) {
        heroMesh.userData.sword.rotation.x = (Math.PI / 4) - Math.sin(heroAttackTime) * 1.5;
      }

      if (heroAttackTime > Math.PI) {
        heroAttacking = false;
        heroMesh.position.x = -2;
        if (heroMesh.userData.sword) {
          heroMesh.userData.sword.rotation.x = Math.PI / 4;
        }
      }
    }

    // Enemy Attack Animation
    if (enemyAttacking && enemyMesh) {
      enemyAttackTime += 0.1;
      enemyMesh.position.x = 2 - Math.sin(enemyAttackTime) * 1.5;
      enemyMesh.rotation.z = Math.sin(enemyAttackTime) * 0.5;

      // Hero hit reaction (tilt back and flash red)
      if (heroMesh) {
         if (enemyAttackTime > 0.5 && enemyAttackTime < 2.5) {
             heroMesh.rotation.z = -0.3;
             heroMesh.traverse((child) => {
               if (child.isMesh && child.material) {
                 const mat = Array.isArray(child.material) ? child.material[0] : child.material;
                 mat.color.setHex(0xff0000);
               }
             });
         } else {
             heroMesh.rotation.z = 0;
             heroMesh.traverse((child) => {
               if (child.isMesh && child.material && child.userData.originalColor !== undefined) {
                 const mat = Array.isArray(child.material) ? child.material[0] : child.material;
                 mat.color.setHex(child.userData.originalColor);
               }
             });
         }
      }

      if (enemyAttackTime > Math.PI) {
        enemyAttacking = false;
        enemyMesh.position.x = 2;
        enemyMesh.rotation.z = 0;
      }
    }

    renderer.render(scene, camera);
  }

  function triggerHeroAttack(text) {
    if (!heroAttacking) {
      heroAttacking = true;
      heroAttackTime = 0;
      createFloatingText(text || "+XP", 2, 2, 0, "#7aa2f7"); // near enemy
    }
  }

  function triggerEnemyAttack() {
    if (!enemyAttacking) {
      enemyAttacking = true;
      enemyAttackTime = 0;
      createFloatingText("HIT!", -2, 2.5, 0, "#ff0000"); // near hero
    }
  }

  function createFloatingText(message, x, y, z, colorStr) {
    // Generate text as a sprite using a 2D canvas
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    canvas.width = 256;
    canvas.height = 128;
    context.font = "Bold 40px Arial";
    context.fillStyle = colorStr;
    context.textAlign = "center";
    context.fillText(message, 128, 64);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(spriteMaterial);
    sprite.position.set(x, y, z);
    sprite.scale.set(3, 1.5, 1);

    scene.add(sprite);
    floatingTexts.push({ sprite: sprite, life: 1.0 });
  }

  function destroy() {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    if (renderer) {
      renderer.dispose();
      const dom = renderer.domElement;
      if (dom && dom.parentNode) {
        dom.parentNode.removeChild(dom);
      }
      renderer = null;
    }

    // Clean up scene resources
    if (scene) {
      scene.traverse((object) => {
        if (object.isMesh || object.isSprite) {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach(mat => {
                 if (mat.map) mat.map.dispose();
                 mat.dispose();
              });
            } else {
              if (object.material.map) object.material.map.dispose();
              object.material.dispose();
            }
          }
        }
      });
      scene = null;
    }

    window.removeEventListener('resize', onWindowResize);

    // Reset attacking states
    heroAttacking = false;
    enemyAttacking = false;
    floatingTexts = [];
  }

  return {
    init,
    triggerHeroAttack,
    triggerEnemyAttack,
    destroy
  };
})();

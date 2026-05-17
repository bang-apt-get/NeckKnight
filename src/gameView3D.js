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
    // Adjusted camera distance for larger models
    camera.position.set(0, 5.5, 13);
    camera.lookAt(0, 1, 0);

    // Renderer
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    // Use container dimensions, default to 400x400 if 0
    renderer.setSize(container.clientWidth || 400, container.clientHeight || 400);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(THEME_ACCENT, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 10, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    scene.add(dirLight);

    // Arena Floor (Low poly floating island)
    arenaGroup = new THREE.Group();
    scene.add(arenaGroup);

    // Make the arena larger for the bigger characters
    const floorGeo = new THREE.CylinderGeometry(7, 6, 1, 8);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x414868, roughness: 0.8 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.position.y = -0.5;
    floor.receiveShadow = true;
    arenaGroup.add(floor);

    // Build Hero
    heroMesh = createHero(heroType);
    heroMesh.position.set(-2.5, 0, 0);
    scene.add(heroMesh);

    // Build Enemy (Goblin by default)
    enemyMesh = createEnemy('goblin');
    enemyMesh.position.set(2.5, 0, 0);
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
    // Scale up overall hero size
    const heroScale = 1.5;

    if (type === 'wizard') {
      // Wizard: Violet robed, larger hat, arms
      const bodyGeo = new THREE.ConeGeometry(0.7, 2, 8);
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x8a2be2 });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 1;
      body.castShadow = true;
      group.add(body);

      const headGeo = new THREE.SphereGeometry(0.4, 16, 16);
      const headMat = new THREE.MeshStandardMaterial({ color: 0xffccaa });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.y = 2.3;
      head.castShadow = true;
      group.add(head);

      // Hat
      const hatBrimGeo = new THREE.CylinderGeometry(0.8, 0.8, 0.1, 16);
      const hatBrim = new THREE.Mesh(hatBrimGeo, bodyMat);
      hatBrim.position.y = 2.6;
      hatBrim.rotation.x = -0.1;
      group.add(hatBrim);

      const hatConeGeo = new THREE.ConeGeometry(0.5, 1.2, 16);
      const hatCone = new THREE.Mesh(hatConeGeo, bodyMat);
      hatCone.position.y = 3.2;
      hatCone.rotation.x = -0.2;
      group.add(hatCone);

      // Arms
      const armGeo = new THREE.CylinderGeometry(0.15, 0.15, 1, 8);
      const leftArm = new THREE.Mesh(armGeo, bodyMat);
      leftArm.position.set(-0.6, 1.2, 0);
      leftArm.rotation.z = Math.PI / 6;
      group.add(leftArm);

      const rightArm = new THREE.Mesh(armGeo, bodyMat);
      rightArm.position.set(0.6, 1.2, 0.3);
      rightArm.rotation.z = -Math.PI / 6;
      rightArm.rotation.x = -Math.PI / 4; // Reaching out for staff
      group.add(rightArm);

      // Detailed Staff
      const staffGroup = new THREE.Group();
      const staffGeo = new THREE.CylinderGeometry(0.08, 0.06, 2.8, 8);
      const staffMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 0.9 });
      const staff = new THREE.Mesh(staffGeo, staffMat);
      staff.position.y = 1.4;
      staffGroup.add(staff);

      const orbGeo = new THREE.SphereGeometry(0.25, 16, 16);
      const orbMat = new THREE.MeshStandardMaterial({ color: 0x00ffff, emissive: 0x00ffff, emissiveIntensity: 0.8 });
      const orb = new THREE.Mesh(orbGeo, orbMat);
      orb.position.y = 2.9;
      staffGroup.add(orb);

      // Glowing ring around orb
      const ringGeo = new THREE.TorusGeometry(0.35, 0.05, 8, 24);
      const ring = new THREE.Mesh(ringGeo, orbMat);
      ring.position.y = 2.9;
      ring.rotation.x = Math.PI / 2;
      staffGroup.add(ring);

      staffGroup.position.set(0.9, 0, 0.7);
      staffGroup.rotation.x = Math.PI / 12;
      group.add(staffGroup);

    } else if (type === 'slime') {
      // Slime: Detailed translucent bouncy green sphere with inner core and eyes
      const bodyGeo = new THREE.SphereGeometry(1.2, 32, 32);
      const bodyMat = new THREE.MeshStandardMaterial({
        color: 0x32cd32,
        transparent: true,
        opacity: 0.6,
        roughness: 0.1,
        metalness: 0.1
      });
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      body.position.y = 1.0;
      body.scale.y = 0.85;
      body.castShadow = true;
      group.add(body);

      // Inner glowing core
      const coreGeo = new THREE.SphereGeometry(0.5, 16, 16);
      const coreMat = new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 0.5 });
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.position.y = 1.0;
      group.add(core);

      // Eyes
      const eyeGeo = new THREE.SphereGeometry(0.15, 16, 16);
      const eyeMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
      const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
      leftEye.position.set(-0.4, 1.4, 0.95);
      group.add(leftEye);

      const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
      rightEye.position.set(0.4, 1.4, 0.95);
      group.add(rightEye);

      // Eye highlights
      const highlightGeo = new THREE.SphereGeometry(0.04, 8, 8);
      const highlightMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
      const leftHighlight = new THREE.Mesh(highlightGeo, highlightMat);
      leftHighlight.position.set(-0.35, 1.48, 1.05);
      group.add(leftHighlight);

      const rightHighlight = new THREE.Mesh(highlightGeo, highlightMat);
      rightHighlight.position.set(0.45, 1.48, 1.05);
      group.add(rightHighlight);

    } else {
      // Knight: Metallic silver detailed blocks
      const armorMat = new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.9, roughness: 0.3 });
      const jointMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.9 });

      // Torso
      const bodyGeo = new THREE.BoxGeometry(1.2, 1.4, 0.8);
      const body = new THREE.Mesh(bodyGeo, armorMat);
      body.position.y = 1.3;
      body.castShadow = true;
      group.add(body);

      // Head
      const headGroup = new THREE.Group();
      const headGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
      const head = new THREE.Mesh(headGeo, armorMat);
      headGroup.add(head);

      // Visor slit
      const visorGeo = new THREE.BoxGeometry(0.6, 0.15, 0.82);
      const visorMat = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x00ffff, emissiveIntensity: 0.2 });
      const visor = new THREE.Mesh(visorGeo, visorMat);
      visor.position.set(0, 0.1, 0.05);
      headGroup.add(visor);

      headGroup.position.y = 2.5;
      group.add(headGroup);

      // Legs
      const legGeo = new THREE.BoxGeometry(0.4, 0.7, 0.4);
      const leftLeg = new THREE.Mesh(legGeo, armorMat);
      leftLeg.position.set(-0.3, 0.35, 0);
      group.add(leftLeg);

      const rightLeg = new THREE.Mesh(legGeo, armorMat);
      rightLeg.position.set(0.3, 0.35, 0);
      group.add(rightLeg);

      // Arms
      const armGeo = new THREE.BoxGeometry(0.3, 1.1, 0.3);
      const leftArm = new THREE.Mesh(armGeo, armorMat);
      leftArm.position.set(-0.8, 1.3, 0);
      group.add(leftArm);

      const rightArmGroup = new THREE.Group();
      const rightArmMesh = new THREE.Mesh(armGeo, armorMat);
      rightArmGroup.add(rightArmMesh);
      rightArmGroup.position.set(0.8, 1.3, 0.2);
      rightArmGroup.rotation.x = -Math.PI / 4; // raised holding sword
      group.add(rightArmGroup);

      // Shield on left arm
      const shieldGeo = new THREE.BoxGeometry(0.1, 1.2, 0.9);
      const shieldMat = new THREE.MeshStandardMaterial({ color: 0x414868, metalness: 0.6, roughness: 0.4 });
      const shield = new THREE.Mesh(shieldGeo, shieldMat);
      shield.position.set(-1.0, 1.3, 0.3);
      group.add(shield);

      // Shield Cross
      const crossGeoV = new THREE.BoxGeometry(0.12, 0.8, 0.2);
      const crossMat = new THREE.MeshStandardMaterial({ color: 0x7aa2f7, metalness: 0.8 });
      const crossV = new THREE.Mesh(crossGeoV, crossMat);
      crossV.position.set(-1.0, 1.3, 0.3);
      group.add(crossV);

      const crossGeoH = new THREE.BoxGeometry(0.12, 0.2, 0.6);
      const crossH = new THREE.Mesh(crossGeoH, crossMat);
      crossH.position.set(-1.0, 1.4, 0.3);
      group.add(crossH);

      // Sword in right arm
      const swordGroup = new THREE.Group();
      const bladeGeo = new THREE.BoxGeometry(0.15, 1.8, 0.25);
      const bladeMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee, metalness: 1.0, roughness: 0.1 });
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.position.y = 1.0;
      swordGroup.add(blade);

      const hiltGeo = new THREE.BoxGeometry(0.5, 0.15, 0.35);
      const hiltMat = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
      const hilt = new THREE.Mesh(hiltGeo, hiltMat);
      swordGroup.add(hilt);

      const pommelGeo = new THREE.BoxGeometry(0.2, 0.4, 0.2);
      const pommel = new THREE.Mesh(pommelGeo, armorMat);
      pommel.position.y = -0.2;
      swordGroup.add(pommel);

      swordGroup.position.set(0, -0.4, 0.3);
      swordGroup.rotation.x = Math.PI / 2;
      rightArmGroup.add(swordGroup);

      group.userData.sword = rightArmGroup; // Animate the whole arm
    }

    group.scale.set(heroScale, heroScale, heroScale);

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
    const enemyScale = 1.3;

    // Detailed Goblin
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x228b22, roughness: 0.9 }); // Forest green
    const clothMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, roughness: 1.0 }); // Brown

    // Body (hunchback)
    const bodyGeo = new THREE.ConeGeometry(0.7, 1.4, 6);
    const body = new THREE.Mesh(bodyGeo, skinMat);
    body.position.y = 0.8;
    body.rotation.x = 0.2; // leaning forward
    body.castShadow = true;
    group.add(body);

    // Loincloth
    const clothGeo = new THREE.CylinderGeometry(0.7, 0.6, 0.5, 6);
    const cloth = new THREE.Mesh(clothGeo, clothMat);
    cloth.position.y = 0.5;
    group.add(cloth);

    // Head
    const headGroup = new THREE.Group();
    const headGeo = new THREE.DodecahedronGeometry(0.5);
    const head = new THREE.Mesh(headGeo, skinMat);
    headGroup.add(head);

    // Ears
    const earGeo = new THREE.ConeGeometry(0.15, 0.6, 4);
    const leftEar = new THREE.Mesh(earGeo, skinMat);
    leftEar.position.set(-0.5, 0.1, 0);
    leftEar.rotation.z = Math.PI / 3;
    leftEar.rotation.x = -0.2;
    headGroup.add(leftEar);

    const rightEar = new THREE.Mesh(earGeo, skinMat);
    rightEar.position.set(0.5, 0.1, 0);
    rightEar.rotation.z = -Math.PI / 3;
    rightEar.rotation.x = -0.2;
    headGroup.add(rightEar);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, emissive: 0x880000 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.2, 0.1, 0.4);
    headGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.2, 0.1, 0.4);
    headGroup.add(rightEye);

    headGroup.position.set(0, 1.6, 0.3); // jutting forward
    group.add(headGroup);

    // Arms
    const armGeo = new THREE.CylinderGeometry(0.15, 0.1, 1, 6);
    const leftArm = new THREE.Mesh(armGeo, skinMat);
    leftArm.position.set(-0.8, 0.9, 0.2);
    leftArm.rotation.z = Math.PI / 4;
    group.add(leftArm);

    const rightArmGroup = new THREE.Group();
    const rightArmMesh = new THREE.Mesh(armGeo, skinMat);
    rightArmGroup.add(rightArmMesh);
    rightArmGroup.position.set(0.8, 1.0, 0.4);
    rightArmGroup.rotation.z = -Math.PI / 6;
    rightArmGroup.rotation.x = -Math.PI / 4;
    group.add(rightArmGroup);

    // Club in right hand
    const clubGeo = new THREE.CylinderGeometry(0.1, 0.25, 1.2, 6);
    const clubMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 1.0 });
    const club = new THREE.Mesh(clubGeo, clubMat);
    club.position.set(0, -0.6, 0.2);
    club.rotation.x = Math.PI / 2;
    rightArmGroup.add(club);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.15, 0.12, 0.6, 6);
    const leftLeg = new THREE.Mesh(legGeo, skinMat);
    leftLeg.position.set(-0.3, 0.3, 0);
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, skinMat);
    rightLeg.position.set(0.3, 0.3, 0);
    group.add(rightLeg);

    group.scale.set(enemyScale, enemyScale, enemyScale);
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
      heroMesh.position.x = -2.5 + Math.sin(heroAttackTime) * 2.0;
      if (heroMesh.userData.sword) {
        // We rotated the whole arm earlier, so just adjusting the arm rotation
        heroMesh.userData.sword.rotation.x = -Math.PI/4 - Math.sin(heroAttackTime) * 1.5;
      }

      if (heroAttackTime > Math.PI) {
        heroAttacking = false;
        heroMesh.position.x = -2.5;
        if (heroMesh.userData.sword) {
          heroMesh.userData.sword.rotation.x = -Math.PI / 4;
        }
      }
    }

    // Enemy Attack Animation
    if (enemyAttacking && enemyMesh) {
      enemyAttackTime += 0.1;
      enemyMesh.position.x = 2.5 - Math.sin(enemyAttackTime) * 2.0;
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
        enemyMesh.position.x = 2.5;
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

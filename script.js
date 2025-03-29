// Tunggu DOM siap
document.addEventListener('DOMContentLoaded', () => {
    // === Global Variables ===
    let scene, camera, renderer, physicsWorld;
    let playerBody, playerMesh;
    let controls = {
        moveForward: false,
        moveBackward: false,
        moveLeft: false,
        moveRight: false,
        jump: false,
        fire: false,
        isPointerLocked: false,
        isPaused: true // Mulai dalam keadaan pause sampai start di klik
    };
    let moveSpeed = 5.0;
    let jumpHeight = 5;
    let clock = new THREE.Clock();
    let sounds = {}; // Objek untuk menyimpan suara Howler
    let enemies = []; // Array untuk menyimpan musuh (placeholder)
    const playerHeight = 1.8;
    const playerRadius = 0.4;

    // === DOM Elements ===
    const canvas = document.getElementById('game-canvas');
    const loadingScreen = document.getElementById('loading-screen');
    const startScreen = document.getElementById('start-screen');
    const startButton = document.getElementById('start-button');
    const pauseMenu = document.getElementById('pause-menu');
    const resumeButton = document.getElementById('resume-button');
    const healthUI = document.getElementById('health');
    const staminaUI = document.getElementById('stamina');
    const ammoUI = document.getElementById('ammo');
    const compassUI = document.getElementById('compass');

    // === Initialization ===
    function init() {
        console.log("Initializing game...");

        // Scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87CEEB); // Sky blue background
        scene.fog = new THREE.Fog(0x87CEEB, 0, 100); // Tambah kabut

        // Camera
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, playerHeight, 5); // Awal posisi kamera sedikit di belakang
        // Kita tidak langsung menambahkan kamera ke player,
        // tapi akan mengaturnya di loop update agar lebih smooth

        // Renderer
        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.shadowMap.enabled = true; // Aktifkan bayangan
        renderer.shadowMap.type = THREE.PCFSoftShadowMap; // Tipe bayangan

        // Physics World (Cannon.js)
        physicsWorld = new CANNON.World();
        physicsWorld.gravity.set(0, -9.82, 0); // Gravitasi normal
        physicsWorld.broadphase = new CANNON.NaiveBroadphase(); // Deteksi benturan sederhana
        physicsWorld.solver.iterations = 10; // Iterasi solver fisika

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 5);
        directionalLight.castShadow = true;
        // Konfigurasi bayangan
        directionalLight.shadow.mapSize.width = 1024;
        directionalLight.shadow.mapSize.height = 1024;
        directionalLight.shadow.camera.near = 0.5;
        directionalLight.shadow.camera.far = 50;
        directionalLight.shadow.camera.left = -20;
        directionalLight.shadow.camera.right = 20;
        directionalLight.shadow.camera.top = 20;
        directionalLight.shadow.camera.bottom = -20;
        scene.add(directionalLight);
        // Optional: Helper untuk melihat area bayangan
        // const shadowHelper = new THREE.CameraHelper(directionalLight.shadow.camera);
        // scene.add(shadowHelper);


        // --- Load Assets (Suara) ---
        loadSounds();

        // --- Create Game World ---
        createGround();
        createPlayer();
        createEnvironmentObjects(); // Tambahkan beberapa objek statis

        // --- Setup Event Listeners ---
        setupEventListeners();

        // --- Hide Loading Screen & Show Start Screen ---
         if (loadingScreen) loadingScreen.style.display = 'none';
         if (startScreen) startScreen.style.display = 'flex'; // Tampilkan layar start


        console.log("Initialization Complete. Waiting for user start.");
        // Game loop tidak dimulai di sini, tapi setelah user klik start
    }

    // === Load Sounds ===
    function loadSounds() {
        // Contoh memuat suara
        sounds.shoot = new Howl({ src: ['sounds/shoot.wav'], volume: 0.5 }); // Ganti dengan path file suara Anda
        sounds.jump = new Howl({ src: ['sounds/jump.wav'], volume: 0.8 });
        sounds.footstep = new Howl({ src: ['sounds/footstep.wav'], volume: 0.3, loop: true }); // Loop untuk suara langkah
        sounds.ambient = new Howl({ src: ['sounds/ambient_city.wav'], volume: 0.2, loop: true, autoplay: false }); // Jangan autoplay dulu

        // Anda perlu menambahkan lebih banyak suara (reload, enemy, environment, music)
        // Pastikan file suara ada di folder 'sounds' atau path yang sesuai
        console.log("Sounds loaded (placeholders).");
         // Sembunyikan loading screen setelah suara (atau aset lain) siap
         // if (loadingScreen) loadingScreen.style.display = 'none';
    }

    // === Create World Elements ===
    function createGround() {
        // Three.js visual
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        // const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x808080, side: THREE.DoubleSide }); // Abu-abu
         const groundMaterial = new THREE.MeshStandardMaterial({
             color: 0xcccccc, // Warna tanah/beton
             roughness: 0.8,
             metalness: 0.2
         });
        const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
        groundMesh.rotation.x = -Math.PI / 2; // Putar agar datar
        groundMesh.receiveShadow = true; // Terima bayangan
        scene.add(groundMesh);

        // Cannon.js physics body
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({ mass: 0 }); // Mass 0 = statis
        groundBody.addShape(groundShape);
        groundBody.quaternion.setFromAxisAngle(new CANNON.Vec3(1, 0, 0), -Math.PI / 2); // Sinkronkan rotasi
        physicsWorld.addBody(groundBody);
    }

     function createEnvironmentObjects() {
         // Contoh: Membuat beberapa kotak sebagai rintangan
         const boxGeometry = new THREE.BoxGeometry(2, 3, 2);
         const boxMaterial = new THREE.MeshStandardMaterial({ color: 0x marrón }); // Coklat

         const positions = [
             { x: 5, y: 1.5, z: -5 },
             { x: -8, y: 1.5, z: 0 },
             { x: 0, y: 1.5, z: -10 }
         ];

         positions.forEach(pos => {
             // Three.js Mesh
             const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial);
             boxMesh.position.set(pos.x, pos.y, pos.z);
             boxMesh.castShadow = true;
             boxMesh.receiveShadow = true;
             scene.add(boxMesh);

             // Cannon.js Body
             const boxShape = new CANNON.Box(new CANNON.Vec3(1, 1.5, 1)); // Setengah ukuran geometri
             const boxBody = new CANNON.Body({ mass: 0 }); // Buat statis
             boxBody.addShape(boxShape);
             boxBody.position.copy(pos);
             physicsWorld.addBody(boxBody);
         });
     }

    // === Player Setup ===
    function createPlayer() {
         // Player Physics Body (Capsule - kombinasi sphere dan box)
         // Atau gunakan silinder jika lebih mudah
         const playerShape = new CANNON.Sphere(playerRadius); // Bentuk dasar sphere untuk bagian bawah
         // Untuk membuat efek kapsul, bisa tambahkan sphere lain di atas atau gunakan Cylinder
         // Untuk simple, kita pakai Sphere dulu
         playerBody = new CANNON.Body({
             mass: 70, // Massa pemain (kg)
             position: new CANNON.Vec3(0, 5, 5), // Posisi awal sedikit di atas tanah
             shape: playerShape,
             linearDamping: 0.9, // Mencegah sliding tak terbatas
             angularDamping: 1.0, // Mencegah rotasi aneh saat jatuh
             fixedRotation: true // Mencegah pemain terguling (penting untuk FPS)
         });

        // Material Fisika untuk Pemain (opsional, untuk mengatur gesekan/pantulan)
         const playerPhysicsMaterial = new CANNON.Material("playerMaterial");
         playerBody.material = playerPhysicsMaterial;
         // Definisikan interaksi antara material pemain dan material default (tanah)
         const defaultMaterial = physicsWorld.defaultMaterial;
         const player_default_contact = new CANNON.ContactMaterial(
             playerPhysicsMaterial,
             defaultMaterial,
             {
                 friction: 0.1, // Sedikit gesekan saat bergerak
                 restitution: 0.1 // Sedikit pantulan saat jatuh
             }
         );
         physicsWorld.addContactMaterial(player_default_contact);


         physicsWorld.addBody(playerBody);

         // Player Visual (Placeholder - Tidak terlihat, hanya untuk debugging jika perlu)
         // Biasanya, kamera *adalah* representasi visual pemain dari sudut pandang orang pertama.
         // Kita tidak perlu mesh pemain yang terlihat oleh pemain itu sendiri.
         // Jika ingin melihat kaki/tangan, itu ditambahkan terpisah dan dipasangkan ke kamera.

         // PENTING: Pasang kamera ke posisi body fisika nanti di game loop
         // agar mengikuti pergerakan fisika.
     }

    // === Event Listeners ===
    function setupEventListeners() {
        document.addEventListener('keydown', onKeyDown);
        document.addEventListener('keyup', onKeyUp);
        window.addEventListener('resize', onWindowResize);
        canvas.addEventListener('click', requestPointerLock);
        document.addEventListener('pointerlockchange', onPointerLockChange);
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mousedown', onMouseDown);
        document.addEventListener('mouseup', onMouseUp);

        // Tombol Start
        startButton.addEventListener('click', () => {
             startScreen.style.display = 'none';
             controls.isPaused = false;
             requestPointerLock(); // Coba kunci pointer saat mulai
             // Mulai audio setelah interaksi user (penting untuk browser modern)
             if (sounds.ambient && !sounds.ambient.playing()) {
                 sounds.ambient.play();
             }
             // Mulai game loop *setelah* user klik start
             animate();
             console.log("Game Started!");
        });

        // Tombol Resume
        resumeButton.addEventListener('click', togglePause);

        // Escape key untuk pause/resume
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                 togglePause();
            }
        });
    }

    function onKeyDown(event) {
        if (controls.isPaused && event.key !== 'Escape') return; // Abaikan input jika paused (kecuali Escape)

        switch (event.code) {
            case 'KeyW': case 'ArrowUp': controls.moveForward = true; break;
            case 'KeyS': case 'ArrowDown': controls.moveBackward = true; break;
            case 'KeyA': case 'ArrowLeft': controls.moveLeft = true; break;
            case 'KeyD': case 'ArrowRight': controls.moveRight = true; break;
            case 'Space': controls.jump = true; break;
        }
    }

    function onKeyUp(event) {
         // Tidak perlu cek isPaused di sini, agar tombol bisa dilepas saat paused
        switch (event.code) {
            case 'KeyW': case 'ArrowUp': controls.moveForward = false; break;
            case 'KeyS': case 'ArrowDown': controls.moveBackward = false; break;
            case 'KeyA': case 'ArrowLeft': controls.moveLeft = false; break;
            case 'KeyD': case 'ArrowRight': controls.moveRight = false; break;
            case 'Space': controls.jump = false; break; // Reset jump flag
        }
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

     function requestPointerLock() {
         if (!controls.isPaused) { // Hanya kunci jika tidak sedang pause
             canvas.requestPointerLock = canvas.requestPointerLock || canvas.mozRequestPointerLock || canvas.webkitRequestPointerLock;
             if (canvas.requestPointerLock) {
                 canvas.requestPointerLock();
             }
         }
     }

     function onPointerLockChange() {
         if (document.pointerLockElement === canvas || document.mozPointerLockElement === canvas || document.webkitPointerLockElement === canvas) {
             controls.isPointerLocked = true;
             console.log('Pointer Locked');
             // Sembunyikan pause menu jika aktif saat pointer terkunci
             if (!pauseMenu.classList.contains('hidden')) {
                 pauseMenu.classList.add('hidden');
             }
         } else {
             controls.isPointerLocked = false;
             console.log('Pointer Unlocked');
             // Jika pointer tidak terkunci dan game belum di-pause manual, pause game
             if (!controls.isPaused) {
                  togglePause(true); // Pause secara otomatis
             }
         }
     }

     // Variabel untuk menyimpan rotasi kamera
     let euler = new THREE.Euler(0, 0, 0, 'YXZ'); // Urutan penting untuk FPS control
     let minPolarAngle = 0; // Batas lihat ke atas
     let maxPolarAngle = Math.PI; // Batas lihat ke bawah

     function onMouseMove(event) {
         if (!controls.isPointerLocked) return; // Hanya proses jika pointer terkunci

         const movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
         const movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

         // Sensitivity (sesuaikan nilainya)
         const sensitivity = 0.002;

         euler.y -= movementX * sensitivity; // Rotasi kiri/kanan (sumbu Y)
         euler.x -= movementY * sensitivity; // Rotasi atas/bawah (sumbu X)

         // Batasi rotasi vertikal (polar angle)
         euler.x = Math.max(Math.PI / 2 - maxPolarAngle, Math.min(Math.PI / 2 - minPolarAngle, euler.x));

         // Terapkan rotasi ke kamera
         camera.quaternion.setFromEuler(euler);
     }

     function onMouseDown(event) {
         if (!controls.isPointerLocked || controls.isPaused) return;
         if (event.button === 0) { // Tombol kiri mouse
             controls.fire = true;
             shoot(); // Panggil fungsi tembak
         }
     }

     function onMouseUp(event) {
          if (!controls.isPointerLocked || controls.isPaused) return;
         if (event.button === 0) {
             controls.fire = false;
         }
     }

     function togglePause(forcePause = false) {
         if (forcePause && controls.isPaused) return; // Jangan lakukan apa-apa jika sudah pause & dipaksa pause

         controls.isPaused = !controls.isPaused || forcePause;

         if (controls.isPaused) {
             pauseMenu.classList.remove('hidden');
             // Lepaskan pointer lock jika sedang terkunci
             document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock || document.webkitExitPointerLock;
             if(document.exitPointerLock && controls.isPointerLocked) {
                 document.exitPointerLock();
             }
             // Hentikan suara yang looping (misal langkah kaki)
             if (sounds.footstep && sounds.footstep.playing()) {
                 sounds.footstep.stop();
             }
             sounds.ambient?.pause(); // Jeda suara ambient

         } else {
             pauseMenu.classList.add('hidden');
             requestPointerLock(); // Coba kunci lagi saat resume
             sounds.ambient?.play(); // Lanjutkan suara ambient
         }
         console.log("Game Paused:", controls.isPaused);
     }


    // === Game Logic ===
    function updatePlayer(deltaTime) {
        if (!playerBody) return;

        const inputVelocity = new THREE.Vector3();
        const eulerY = new THREE.Euler(0, euler.y, 0, 'YXZ'); // Hanya ambil rotasi Y (kiri/kanan)

        // Tentukan arah berdasarkan input dan rotasi kamera
        if (controls.moveForward) {
            inputVelocity.z = -1;
        }
        if (controls.moveBackward) {
            inputVelocity.z = 1;
        }
        if (controls.moveLeft) {
            inputVelocity.x = -1;
        }
        if (controls.moveRight) {
            inputVelocity.x = 1;
        }

        inputVelocity.normalize(); // Pastikan kecepatan diagonal sama
        inputVelocity.applyEuler(eulerY); // Terapkan rotasi kamera ke arah gerakan

        // --- Pergerakan ---
        const currentVelocity = playerBody.velocity;
        const targetVelocity = new CANNON.Vec3(
            inputVelocity.x * moveSpeed,
            currentVelocity.y, // Jaga kecepatan vertikal (gravitasi/lompat)
            inputVelocity.z * moveSpeed
        );

        // Terapkan gaya atau langsung set velocity (lebih responsif untuk FPS)
        playerBody.velocity.x = targetVelocity.x;
        playerBody.velocity.z = targetVelocity.z;

        // --- Lompat ---
        // Deteksi apakah pemain di tanah (perlu cara yang lebih baik, misal raycast ke bawah)
        // Untuk sekarang, anggap bisa lompat jika kecepatan Y mendekati 0
         let canJump = Math.abs(playerBody.velocity.y) < 0.1; // Cek sederhana

         // Contoh deteksi tanah yang lebih baik (Raycast)
         const rayStart = playerBody.position;
         const rayEnd = new CANNON.Vec3(playerBody.position.x, playerBody.position.y - playerRadius - 0.1, playerBody.position.z);
         const ray = new CANNON.Ray(rayStart, rayEnd);
         const result = new CANNON.RaycastResult();
         canJump = physicsWorld.raycastClosest(rayStart, rayEnd, {}, result);


        if (controls.jump && canJump) {
            playerBody.velocity.y = jumpHeight; // Berikan kecepatan vertikal untuk lompat
            if (sounds.jump) sounds.jump.play();
            controls.jump = false; // Hanya lompat sekali per tekanan
        }

         // --- Suara Langkah Kaki ---
         const isMovingOnGround = (controls.moveForward || controls.moveBackward || controls.moveLeft || controls.moveRight) && canJump;
         if (isMovingOnGround && sounds.footstep && !sounds.footstep.playing()) {
             sounds.footstep.play();
         } else if (!isMovingOnGround && sounds.footstep && sounds.footstep.playing()) {
             sounds.footstep.stop();
         }

        // --- Update Posisi Kamera ---
        // Kamera sedikit di atas pusat body fisika
        camera.position.copy(playerBody.position);
        camera.position.y += playerHeight * 0.8; // Sesuaikan offset mata

        // Update UI (Contoh)
        // healthUI.textContent = `Health: ${currentPlayerHealth}`;
        // staminaUI.textContent = `Stamina: ${currentPlayerStamina}`;
        // ammoUI.textContent = `Ammo: ${currentAmmo}/${totalAmmo}`;

        // Update Compass (Contoh sederhana - gunakan rotasi Y kamera)
        const angle = (euler.y * 180 / Math.PI) % 360;
        let direction = 'N';
        if (angle > -45 && angle <= 45) direction = 'N';
        else if (angle > 45 && angle <= 135) direction = 'W';
        else if (angle > 135 || angle <= -135) direction = 'S';
        else if (angle > -135 && angle <= -45) direction = 'E';
        compassUI.textContent = direction;

    }

    function shoot() {
        if (!controls.isPointerLocked || controls.isPaused) return;

        console.log("Shoot!");
        if (sounds.shoot) sounds.shoot.play();

        // TODO: Implementasi Raycasting untuk deteksi tembakan
        // 1. Buat Ray dari posisi kamera ke arah pandangan kamera
        // 2. Cek tabrakan Ray dengan objek di scene (terutama musuh)
        // 3. Jika kena musuh, kurangi health musuh, tampil

document.addEventListener('DOMContentLoaded', () => {

  // --- 1. UI Elements ---
  const loadingScreen = document.getElementById('loading-screen');
  const mainContent = document.getElementById('main-content');
  const themeToggleBtn = document.getElementById('theme-toggle');
  const capturedTextEl = document.getElementById('captured-text');
  const buildBtn = document.getElementById('build-btn');
  const resultsStack = document.getElementById('results-stack');
  const styleBtns = document.querySelectorAll('.style-btn');
  const closeWidgetBtn = document.getElementById('close-widget-btn');

  let selectedStyle = 'cooking';
  let capturedConcept = '';


  // --- Resize Widget ---
  function resizeConceptVerseWidget() {
    const height = document.documentElement.scrollHeight;

    window.parent.postMessage({
      type: 'CV_RESIZE',
      height: height
    }, '*');
  }


  // --- 2. Splash Screen Sequence ---
  loadingScreen.style.display = 'flex';
  loadingScreen.style.opacity = '1';
  mainContent.style.display = 'none';

  setTimeout(() => {
    loadingScreen.style.opacity = '0';

    setTimeout(() => {
      loadingScreen.style.display = 'none';
      mainContent.style.display = 'flex';

      // Resize after loading screen disappears
      setTimeout(resizeConceptVerseWidget, 100);

    }, 400);

  }, 1000);


  // --- 3. Theme Initialization ---
  chrome.storage.local.get(['theme'], (result) => {

    if (result.theme === 'light') {
      document.body.classList.add('light-mode');
    }

  });


  themeToggleBtn.addEventListener('click', () => {

    document.body.classList.toggle('light-mode');

    const isLightMode =
      document.body.classList.contains('light-mode');

    chrome.storage.local.set({
      theme: isLightMode ? 'light' : 'dark'
    });

    // Resize in case theme changes layout
    setTimeout(resizeConceptVerseWidget, 100);

  });


  // --- 4. Close Widget Button ---
  if (closeWidgetBtn) {

    closeWidgetBtn.addEventListener('click', () => {

      // Send message to content.js
      window.parent.postMessage(
        'CLOSE_CV_WIDGET',
        '*'
      );

    });

  }


  // --- 5. Initial Load Captured Text ---
  chrome.storage.local.get(['capturedText'], (result) => {

    if (result.capturedText) {

      capturedConcept = result.capturedText;

      capturedTextEl.textContent =
        capturedConcept;

    }

  });


  // --- 6. Live Update Text ---
  chrome.storage.onChanged.addListener((changes, namespace) => {

    if (changes.capturedText) {

      capturedConcept =
        changes.capturedText.newValue;

      capturedTextEl.textContent =
        capturedConcept;


      // Flash the box briefly
      capturedTextEl.style.transition =
        'background-color 0.3s';

      capturedTextEl.style.backgroundColor =
        'var(--accent-glow)';

      setTimeout(() => {

        capturedTextEl.style.backgroundColor =
          'transparent';

      }, 500);


      // Resize after captured text changes
      setTimeout(
        resizeConceptVerseWidget,
        100
      );

    }

  });


  // --- 7. Handle Analogy Style Selection ---
  styleBtns.forEach(btn => {

    btn.addEventListener('click', (e) => {

      styleBtns.forEach(b =>
        b.classList.remove('active')
      );

      e.target.classList.add('active');

      selectedStyle =
        e.target.getAttribute('data-style');

    });

  });


  // --- 8. Backend API Connection ---
  buildBtn.addEventListener('click', async () => {

    if (!capturedConcept) {

      alert(
        "Please highlight a concept on the webpage and click the blue bubble first!"
      );

      return;
    }


    // Convert slider value into difficulty
    const sliderValue =
      document.getElementById(
        'difficulty-slider'
      ).value;

    let difficultyLevel = "intermediate";

    if (sliderValue === "1")
      difficultyLevel = "beginner";

    if (sliderValue === "3")
      difficultyLevel = "advanced";


    // UI Loading State
    buildBtn.textContent =
      "BUILDING...";

    resultsStack.style.display =
      'grid';


    // Resize immediately when results appear
    setTimeout(
      resizeConceptVerseWidget,
      100
    );


    document.getElementById(
      'res-analogy-type'
    ).textContent =
      selectedStyle.toUpperCase();


    // Reset fields to loading text
    document.getElementById(
      'res-explanation'
    ).textContent =
      "Analyzing concept...";

    document.getElementById(
      'res-analogy'
    ).textContent =
      "Cooking up an analogy...";

    document.getElementById(
      'res-mnemonic'
    ).textContent =
      "Generating memory aids...";

    document.getElementById(
      'res-exam'
    ).textContent =
      "Formulating answer...";


    try {

      // --- Backend Request ---
      const response = await fetch(
        'http://127.0.0.1:8000/api/generate',
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json'
          },

          body: JSON.stringify({

            text: capturedConcept,

            analogy_style:
              selectedStyle,

            difficulty:
              difficultyLevel

          })

        }
      );


      if (!response.ok) {

        throw new Error(
          `HTTP error! status: ${response.status}`
        );

      }


      const data =
        await response.json();


      // --- Display Results ---
      document.getElementById(
        'res-explanation'
      ).textContent =
        data.simple_explanation ||
        "No explanation provided.";


      document.getElementById(
        'res-analogy'
      ).textContent =
        data.analogy ||
        "No analogy provided.";


      document.getElementById(
        'res-mnemonic'
      ).textContent =
        data.mnemonic ||
        "No mnemonic provided.";


      document.getElementById(
        'res-exam'
      ).textContent =
        data.exam_answer ||
        "No exam answer provided.";


      // Resize after actual results arrive
      setTimeout(
        resizeConceptVerseWidget,
        100
      );


    } catch (error) {

      console.error(
        "Backend connection failed:",
        error
      );


      document.getElementById(
        'res-explanation'
      ).textContent =
        "Error: Could not connect to backend.";


      document.getElementById(
        'res-analogy'
      ).textContent =
        "Please ensure your Python server is running.";


      document.getElementById(
        'res-mnemonic'
      ).textContent =
        "Check terminal for errors.";


      document.getElementById(
        'res-exam'
      ).textContent =
        "Error code: " +
        error.message;


      // Resize after error
      setTimeout(
        resizeConceptVerseWidget,
        100
      );


    } finally {

      buildBtn.textContent =
        "BUILD MY CONCEPT";

    }

  });

});
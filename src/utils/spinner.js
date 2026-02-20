/**
 * Simple loading spinner
 */

const spinnerFrames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
let spinnerInterval = null;
let spinnerIndex = 0;

function startSpinner(message = 'Loading...') {
  spinnerIndex = 0;
  process.stdout.write('\n  ');

  spinnerInterval = setInterval(() => {
    process.stdout.write(`\r  \x1b[36m${spinnerFrames[spinnerIndex]}\x1b[0m ${message}`);
    spinnerIndex = (spinnerIndex + 1) % spinnerFrames.length;
  }, 80);
}

function stopSpinner(successMessage = null) {
  if (spinnerInterval) {
    clearInterval(spinnerInterval);
    spinnerInterval = null;
  }

  // Clear the spinner line
  process.stdout.write('\r\x1b[K');

  if (successMessage) {
    console.log(`  \x1b[32m✓\x1b[0m ${successMessage}`);
  }
}

module.exports = { startSpinner, stopSpinner };

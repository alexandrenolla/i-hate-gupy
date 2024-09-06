let isEnabled = false;

document.getElementById("dropdown").addEventListener("change", (event) => {
    isEnabled = event.target.value === 'yes';


    const warningMessage = document.getElementById("warning-message");
    if (isEnabled) {
      warningMessage.textContent = 'Extensão está habilitada. a maldade da Gupy está sendo filtrada!😁';
      warningMessage.className = 'green';
    } else {
      warningMessage.textContent = 'Extensão está desabilitada. a maldade da Gupy não está sendo filtrada!🙁';
      warningMessage.className = 'red';
    }
});



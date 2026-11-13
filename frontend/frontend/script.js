const fileInput = document.getElementById("invoiceFile");
const uploadButton = document.getElementById("uploadButton");
const uploadStatus = document.getElementById("uploadStatus");

uploadButton.addEventListener("click", () => {
    const file = fileInput.files[0];

    if (!file) {
        uploadStatus.textContent = "Please select an invoice first.";
        fileInput.focus();
        return;
    }

    uploadStatus.textContent = `Selected: ${file.name}. No file was uploaded.`;
});

fileInput.addEventListener("change", () => {
    uploadStatus.textContent = "";
});

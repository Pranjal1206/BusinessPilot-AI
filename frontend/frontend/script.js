
function uploadInvoice() {
    const fileInput = document.getElementById("invoiceFile");

    if (fileInput.files.length === 0) {
        alert("Please select an invoice first!");
        return;
    }

    const file = fileInput.files[0];

    alert("Invoice selected: " + file.name);
}

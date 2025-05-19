document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("uploadForm");
  const progressContainer = document.getElementById("progressBarContainer");
  const progressBar = document.getElementById("progressBar");

  form.addEventListener("submit", e => {
    e.preventDefault();

    const formData = new FormData(form);
    const xhr = new XMLHttpRequest();

    xhr.open("POST", "/upload", true);

    xhr.upload.addEventListener("loadstart", () => {
      progressContainer.style.display = "block";
      progressBar.style.width = "0";
    });

    xhr.upload.addEventListener("progress", e => {
      if (e.lengthComputable) {
        const percent = (e.loaded / e.total) * 100;
        progressBar.style.width = percent + "%";
      }
    });

    xhr.onload = () => {
      if (xhr.status === 200) {
        alert("Upload complete!");
        window.location.href = "/";
      } else {
        alert("Upload failed.");
      }
    };

    xhr.send(formData);
  });
});
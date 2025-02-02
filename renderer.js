document.addEventListener('DOMContentLoaded', () => {
    const dragArea = document.querySelector('.drag-and-drop-area');
    const filesContainer = document.getElementById('files');
    const selectedFiles = [];

    //#region Drag & Drop Events
    dragArea.addEventListener('dragover', (event) => {
        event.preventDefault();

        dragArea.classList.add('focus');
    });

    dragArea.addEventListener('dragenter', (event) => {
        event.preventDefault();

        dragArea.classList.add('focus');
    });

    dragArea.addEventListener('dragleave', (event) => {
        event.preventDefault();

        dragArea.classList.remove('focus');
    });


    dragArea.addEventListener('drop', async (event) => {
        event.preventDefault();
        dragArea.classList.remove('focus');
        const files = Array.from(event.dataTransfer.files);

        selectedFiles.length = 0;

        for (const file of files) {
            let path = await window.electronAPI.getFilePath(file);
            if (path) addFile({ path, name: path.split(/[/\\]/).pop() });
        }
        updateSelectedFilesUI();
    });
    //#endregion

    window.electronAPI.onTrayButtonPressed( async () => {
        const filePaths = await window.electronAPI.selectFiles();
                
        // If there are selected file paths, reset the selectedFiles array and add new selections
        if (filePaths && filePaths.length) {
            selectedFiles.length = 0;  // Clear current selections
            filePaths.forEach((filePath) => {
                addFile({ path: filePath, name: filePath.split(/[/\\]/).pop()});
            });
            updateSelectedFilesUI();
        }
    });

    // Initialize button listeners
    setButtonListeners();

    function setButtonListeners() {
        // Browse File Button
        const browseButton = document.getElementById('browse-button');
        if (browseButton) {
            browseButton.addEventListener('click', async () => {
                const filePaths = await window.electronAPI.selectFiles();
                
                // If there are selected file paths, reset the selectedFiles array and add new selections
                if (filePaths && filePaths.length) {
                    selectedFiles.length = 0;  // Clear current selections
                    filePaths.forEach((filePath) => {
                        addFile({ path: filePath, name: filePath.split(/[/\\]/).pop()});
                    });
                    updateSelectedFilesUI();
                }
            });
               
        }
        // Convert Button Click
        const convertButton = document.getElementById('convert-button');
        if (convertButton) {
            convertButton.addEventListener('click', convertFiles);
        }
    }

    function addFile(file) {
        if (!selectedFiles.find(f => f.path === file.path)) {
            selectedFiles.push(file);
        }
    }

    function updateSelectedFilesUI() {
        const fileCount = selectedFiles.length;
        const displayText = fileCount === 1 ? selectedFiles[0].name : `${fileCount} files selected`;
        
        dragArea.innerHTML = `
            <h2>${displayText}</h2>
            <div class="button-container">
                <button id="browse-button">Browse Files</button>
                <button id="convert-button">Convert</button>
            </div>
        `;
        setButtonListeners();
    }

    async function convertFiles() {
        if (!selectedFiles.length) return;
        document.getElementById('loading-indicator').style.display = 'block';
        
        try {
            for (const file of selectedFiles) {
                const { filePath, size, message } = await window.electronAPI.compressFile(file.path);
                addFileToConvertedList(filePath, size, message);
            }
            resetDragArea();
        } catch (error) {
            alert(error.message);
        } finally {
            document.getElementById('loading-indicator').style.display = 'none';
        }
    }

    function resetDragArea() {
        selectedFiles.length = 0;
        dragArea.innerHTML = `
            <h2>Drag & Drop to Upload Files</h2>
            <h3>OR</h3>
            <button id="browse-button">Browse Files</button>
        `;
        setButtonListeners();
    }

    function addFileToConvertedList(filePath, fileSize, message) {
        const fileDiv = document.createElement('div');
        const fileName = filePath.split(/[/\\]/).pop();
        fileDiv.classList.add('file');
        fileDiv.innerHTML = `
            <a class="name" href="${filePath}" download>${fileName}</a>
            <span class="size">${fileSize}</span>
            <span class="close">✕</span>
            <span class="message">${message || ''}</span>
        `;
        filesContainer.appendChild(fileDiv);
        fileDiv.querySelector('.close').addEventListener('click', () => {
            fileDiv.remove();
            const index = selectedFiles.findIndex(f => f.path === filePath);
            if (index !== -1) selectedFiles.splice(index, 1);
            updateSelectedFilesUI();
            resetDragArea();
        });
    }
});

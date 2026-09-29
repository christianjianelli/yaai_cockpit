sap.ui.define([
    "sap/m/MessageToast",
    "sap/m/MessageBox"
],
    function (MessageToast, MessageBox) {
        "use strict";
        return {

            chatId: "",

            api: "",

            apiKey: "",

            agentId: "",

            attachments: new Map(),

            _sidePanelControl: null,

            _selectApiControl: null,

            _resourceBundle: null,

            _abortMonitorAsyncExecution: false,

            setResourceBundle(resourceBundle) {

                this._resourceBundle = resourceBundle;

            },

            setSidePanel(control) {

                this._sidePanelControl = control;

            },

            getSidePanel() {

                return this._sidePanelControl;

            },

            setSelectApiControl(control) {

                this._selectApiControl = control;

            },

            getSelectApiControl() {

                return this._selectApiControl;

            },

            setAbortMonitorAsyncExecution(value) {

                this._abortMonitorAsyncExecution = value;
            
            },

            addUserMessage: function (message, seqno = 0, datetime = "", scroll = true) {
                let timestamp = datetime;
                if (datetime === "") {
                    //timestamp = new Date().toLocaleString();
                }
                const container = document.querySelector('#aaic-chat-message-container');
                if (!container) {
                    return;
                }
                const div = document.createElement('div');
                div.id = `aaic-chat-message-${seqno}`;
                div.className = 'aaic-chat-message aaic-chat-user-message';
                div.innerHTML = `
            <div class="aaic-chat-message-bubble">
                <p>${message}</p>
            </div>
            <div class="aaic-chat-message-timestamp">${timestamp}</div>
            `;
                container.appendChild(div);

                // Render markdown for the new message
                const p = div.querySelector('.aaic-chat-message-bubble p');
                p.innerHTML = window.marked.parse(p.textContent);

                // Scroll to the new message
                if (scroll === true) {
                    setTimeout(() => {
                        const target = document.querySelector('.sapFSPSideContentInner');
                        if (target) {
                            target.scrollTo({
                                top: target.scrollHeight,
                                behavior: 'smooth'
                            });
                        }
                    }, 300);
                }
            },

            addLlmMessage: function (message, seqno = 0, datetime = "", scroll = true) {
                let timestamp = datetime;
                if (datetime === "") {
                    //timestamp = new Date().toLocaleString();
                }
                const container = document.querySelector('#aaic-chat-message-container');
                if (!container) {
                    return;
                }
                const div = document.createElement('div');
                div.id = `aaic-chat-message-${seqno}`;
                div.className = 'aaic-chat-message aaic-chat-llm-message';
                div.innerHTML = `
            <div class="aaic-chat-message-bubble">
                <div class="markdown-content">${message}</div>
            </div>
            <div class="aaic-chat-message-timestamp">${timestamp}</div>
            `;
                container.appendChild(div);

                // Render markdown for the new message
                const markdownDiv = div.querySelector('.markdown-content');
                markdownDiv.innerHTML = window.marked.parse(markdownDiv.textContent);

                // Scroll to the new message
                if (scroll === true) {
                    setTimeout(() => {
                        const target = document.querySelector('.sapFSPSideContentInner');
                        if (target) {
                            target.scrollTo({
                                top: target.scrollHeight,
                                behavior: 'smooth'
                            });
                        }
                    }, 300);
                }

            },

            addLlmTyping: function() {
                // Prevent multiple indicators
                if (document.getElementById("aaic-chat-llm-typing")) return;
                const container = document.querySelector("#aaic-chat-message-container");
                const typingDiv = document.createElement("div");
                typingDiv.id = "aaic-chat-llm-typing";
                typingDiv.className = "aaic-chat-message aaic-chat-llm-message";
                typingDiv.innerHTML = `
                <div class="aaic-chat-message-bubble">
                    <div class="aaic-chat-llm-typing">
                    <div class="aaic-llm-typing-dot"></div>
                    <div class="aaic-llm-typing-dot"></div>
                    <div class="aaic-llm-typing-dot"></div>
                    </div>
                </div>
                <div class="aaic-chat-message-timestamp"></div>
                `;
                container.appendChild(typingDiv);
                // Scroll to the new message
                if (scroll === true) {
                    setTimeout(() => {
                        const target = document.querySelector('.sapFSPSideContentInner');
                        if (target) {
                            target.scrollTo({
                                top: target.scrollHeight,
                                behavior: 'smooth'
                            });
                        }
                    }, 300);
                }
            },

            /**
             * Removes the LLM typing indicator from the message-container
             */
            removeLlmTyping: function() {
                const typingDiv = document.getElementById("aaic-chat-llm-typing");
                if (typingDiv) {
                    typingDiv.remove();
                }
            },

            addWelcomeMessage: function () {

                //How can I assist you today?
                this.addLlmMessage(this._resourceBundle.getText("greeting"), 999999);

            },

            clear: function () {

                this.chatId = '';

                document.getElementById('aaic-chat-message-container').innerHTML = '';

                document.getElementById('aaic-chat-attachments-container').innerHTML = '';

                this.addWelcomeMessage();

                this.attachments.clear();

                //Chat cleared.
                MessageToast.show(this._resourceBundle.getText("chatCleared"));

            },

            getEndpoint: function (resource) {

				let baseUrl = '/sap/yaai/';
				let urlParams = '?r=' + Date.now();

				return baseUrl + resource + urlParams;

			},

            sendUserPromptAsync: async function(userPrompt, api, apikey, agentId = '') {

                let responseData = {};
                
                let taskId = "";
                
                let asyncChat = {
                    chat_id: this.chatId,
                    api: api,     
                    api_key: apikey, 
                    message: userPrompt, 
                    context: '', 
                    agent_id: agentId,
                    model: '',
                    files:[]
                };

                asyncChat.files = await this._getAttachmentsAsBase64();

                let endpoint = this.getEndpoint('async_chat');

                this._abortMonitorAsyncExecution = false;

                // Add the User prompt to the chat
                this.addUserMessage(userPrompt);

                this.addLlmTyping();

                //console.log(JSON.stringify(asyncChat));

                //const container = document.querySelector('#aaic-chat-message-container');
                
                //container.querySelectorAll('.aaic-attachment-ghost-temp').forEach(btn => btn.remove());
                
                const attachmentsContainer = document.querySelector('#aaic-chat-attachments-container');

                attachmentsContainer.innerHTML = '';

                try {

                    // Await the fetch call. This pauses execution until the response is received.
                    responseData = await this._fetchData(endpoint, {
                        method: 'POST',
                        body: JSON.stringify(asyncChat)
                    });

                    taskId = responseData.taskId;

                    this.chatId = responseData.chatId;

                    this.attachments.clear();

                    //console.log(responseData);

                } catch (error) {
                    
                    // Handle any errors during the fetch or parsing process
                    console.error('Operation failed:', error);

                    MessageBox.error(this._resourceBundle.getText("operationFailed"));

                    this.removeLlmTyping();

                    return;
                    
                }

                if (responseData.created === false) {

                    console.error('Operation failed!');

                    if (responseData.error) {

                        console.error('Error details:', responseData.error);

                        MessageBox.error(responseData.error);

                    }

                    this.removeLlmTyping();

                    return;
                }   

                if (taskId == "" || taskId == " ") {

                    console.error('Operation failed!');

                    MessageBox.error(this._resourceBundle.getText("operationFailed"));

                    this.removeLlmTyping();

                    return;
                } 

                // Poll for status until completed
                await this._monitorAsyncExecution(taskId);

                await this._loadChatMessages();

                this.removeLlmTyping();
            },
            
            resumeChat: async function(id = "") {

                if (id !=="") {
                  this.chatId = id;
                }

                if (this.chatId ==="") {
                  return;
                }

                let container;

                let attempts = 1;

                while (!container) {
                    
                    // Wait 0.5 seconds between checks
                    await new Promise(resolve => setTimeout(resolve, 500));

                    container = document.getElementById('aaic-chat-message-container');
                    
                    attempts++;

                    if (attempts > 5) {
                        break;
                    }
                }

                if (container) {
                    container.innerHTML = '';    
                }
                
                this._loadChatMessages();

            },

            addGhostAttachment: async function(file, id, seqno = 0) {

                let container;

                if (seqno > 0) {
                  container = document.getElementById(`aaic-chat-message-${seqno}`);
                } else {
                  container = document.querySelector('#aaic-chat-attachments-container');
                }

                if (!container) {
                    return;
                }

                const base64File = await this._fileToBase64(file);

                const ghost = document.createElement("div");
                
                ghost.className = "aaic-attachment-ghost";

                let icon = this._getIcon(file);

                if (file.type.startsWith("image/")) {
                    icon = `<img src="data:${file.type};base64, ${base64File}" width="50" height="50" alt="Attachment Icon" />`;
                }

                if (seqno === 0) {

                    ghost.className = "aaic-attachment-ghost-temp";

                    ghost.innerHTML = `
                    <div class="aaic-attachment-icon">${icon}</div>

                    <div class="aaic-attachment-info">
                        <div class="aaic-attachment-name">${file.name || "Unnamed file"}</div>
                        <div class="aaic-attachment-size">${this._formatBytes(file.size)}</div>
                    </div>

                    <button class="aaic-attachment-remove-btn" title="Discard">&times;</button>
                    `;

                    ghost.querySelector(".aaic-attachment-remove-btn").addEventListener("click", () => {
                                    
                        this.attachments.delete(id);

                        // Remove UI
                        ghost.remove();

                        console.log("Remaining attachments:", this.attachments.size);
                    });

                } else {

                    ghost.innerHTML = `
                    <div class="aaic-attachment-icon">${icon}</div>

                    <div class="aaic-attachment-info">
                        <div class="aaic-attachment-name">${file.name || "Unnamed file"}</div>
                        <div class="aaic-attachment-size">${this._formatBytes(file.size)}</div>
                    </div>
                    `;
                }

                container.appendChild(ghost);
            },

            //################ Private APIs ###################

            _monitorAsyncExecution: async function(taskId) {

                const that = this;

                // Poll for status until completed
                let isCompleted = false;
                let attempts = 0;

                let endpoint = this.getEndpoint('async_chat');
                
                const maxAttempts = 120; // Prevent infinite loops

                let statusResponseData = {};
                
                while (!isCompleted && attempts < maxAttempts) {
                
                    if (this._abortMonitorAsyncExecution) {
                        console.log('Chat monitoring aborted by user.');
                        this.removeLlmTyping();
                        return;
                    }
                    
                    // Wait 2 seconds between checks
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    try {

                        await this._loadChatMessages();

                        // Check status
                        statusResponseData = await this._fetchData(endpoint + "&task_id=" + taskId);
                    
                        console.log(`Attempt ${attempts + 1}: Status is ${statusResponseData.status}`);
                        
                        if (statusResponseData.status.toUpperCase() === 'FINISHED') {
                            isCompleted = true;
                            //console.log('Process completed!', statusResponseData);
                            break;
                        } else if (statusResponseData.status.toUpperCase() === 'FAILED') {
                            throw new Error('Process failed!');
                        } else {
                            this.addLlmTyping();
                        }

                    } catch (error) {
                        
                        this.removeLlmTyping();

                        // Handle any errors during the fetch or parsing process
                        console.error('Operation failed:', error);

                        MessageBox.error(this._resourceBundle.getText("operationFailed"));

                        return;
                    }
                    
                    attempts++;

                    if ((attempts % 10) == 0 ) {
                        MessageToast.show(this._resourceBundle.getText("taskIsStillRunning"));
                    }
                }

                if (statusResponseData.status.toUpperCase() === 'RUNNING') {
                    
                    MessageBox.information(this._resourceBundle.getText("taskIsStillRunningTimeout"));

                }

            },
                        
            _loadChatMessages: async function() {

                if (this.chatId === "" || this.chatId === undefined) {
                    console.error('Empty Chat ID');
                    return;
                }
                
                const endpoint = this.getEndpoint('chat');

                let responseData = {};

                try {

                    responseData = await this._fetchData(endpoint + "&id=" + this.chatId);

                } catch (error) {
                    
                    // Handle any errors during the fetch or parsing process
                    console.error('Operation failed:', error);

                    MessageBox.error(this._resourceBundle.getText("operationFailed"));

                    return;
                }

                if (!responseData.chat || !responseData.chat.messages) {

                    console.error('No response received');
                    
                    MessageBox.error(this._resourceBundle.getText("operationFailed"));

                    return;

                }

                let newChatMessages = [];

                if (responseData.chat && responseData.chat.messages && Array.isArray(responseData.chat.messages)) {

                    responseData.chat.messages.forEach(element => {

                        let renderedChatMessage = document.getElementById(`aaic-chat-message-${element.seqno}`);

                        if (!renderedChatMessage) {
                            newChatMessages.push(element);
                        }
                        
                    });

                }

                let tempUserMsg = document.getElementById(`aaic-chat-message-0`);

                newChatMessages.forEach(newMessage => {

                    let msg;

                    switch (responseData.chat.api) {
                        
                        case 'OPENAI':
                            
                            msg = JSON.parse(newMessage.msg);

                            try {
                                const parsed = JSON.parse(msg.content);
                                msg.content = parsed;
                            } catch (error) {
                                //No problem ...
                            }

                            if (msg.role.toLowerCase() === "user") {
                                
                                if (tempUserMsg) {
                                    // Discard temporary user message rendered
                                    tempUserMsg.remove();
                                }

                                this.removeLlmTyping();

                                this.addUserMessage(msg.content, newMessage.seqno, this._getDateTime(newMessage.msgDate, newMessage.msgTime) );

                                responseData.chat.files.forEach(file => {
                                    if (file.seqno === newMessage.seqno) {
                                        const fileObj = this._base64ToFile(file.content, file.filename, file.fileType);
                                        this.addGhostAttachment(fileObj, file.filename, file.seqno);
                                    }
                                });

                            }

                            if (msg.role.toLowerCase() === "assistant") {

                                if (Array.isArray(msg.content)) {

                                    msg.content.forEach(contentElement => {

                                        if (element.type === "text") {

                                            this.removeLlmTyping();

                                            this.addLlmMessage(contentElement.text, newMessage.seqno );
                                        }
                                    
                                    });

                                } else {

                                    this.removeLlmTyping();

                                    this.addLlmMessage(msg.content, newMessage.seqno, this._getDateTime(newMessage.msgDate, newMessage.msgTime) );
                                }
                            }

                            break;
                        
                        case 'ANTHROPIC':

                            msg = JSON.parse(newMessage.msg);

                            try {
                                const parsed = JSON.parse(msg.content);
                                msg.content = parsed;
                            } catch (error) {
                                //No problem ...
                            }

                            if (msg.role.toLowerCase() === "user") {

                                if (Array.isArray(msg.content)) {
                                
                                    msg.content.forEach(contentElement => {

                                        if (contentElement.type === "text") {
                                            
                                            if (tempUserMsg) {
                                                // Discard temporary user message rendered
                                                tempUserMsg.remove();
                                            }

                                            this.removeLlmTyping();

                                            this.addUserMessage(msg.contentElement.text , newMessage.seqno, this._getDateTime(newMessage.msgDate, newMessage.msgTime) );

                                            responseData.chat.files.forEach(file => {
                                                if (file.seqno === newMessage.seqno) {
                                                    const fileObj = this._base64ToFile(file.content, file.filename, file.fileType);
                                                    this.addGhostAttachment(fileObj, file.filename, file.seqno);
                                                }
                                            });

                                        }
                                    
                                    });

                                } else {

                                    if (tempUserMsg) {
                                        // Discard temporary user message rendered
                                        tempUserMsg.remove();
                                    }

                                    this.removeLlmTyping();

                                    this.addUserMessage(msg.content , newMessage.seqno, this._getDateTime(newMessage.msgDate, newMessage.msgTime) );

                                    responseData.chat.files.forEach(file => {
                                        if (file.seqno === newMessage.seqno) {
                                            const fileObj = this._base64ToFile(file.content, file.filename, file.fileType);
                                            this.addGhostAttachment(fileObj, file.filename, file.seqno);
                                        }
                                    });

                                }
                            }

                            if (msg.role.toLowerCase() === "assistant") {

                                if (Array.isArray(msg.content)) {

                                    msg.content.forEach(contentElement => {

                                        if (contentElement.type === "text") {

                                            this.removeLlmTyping();

                                            this.addLlmMessage(contentElement.text, newMessage.seqno, this._getDateTime(newMessage.msgDate, newMessage.msgTime) );
                                        }
                                    
                                    });

                                } else {

                                    if(!msg.content.type) {

                                        this.removeLlmTyping();

                                        this.addLlmMessage(msg.content, newMessage.seqno, this._getDateTime(newMessage.msgDate, newMessage.msgTime) );
                                    }

                                }
                            }

                            break;

                        case 'GOOGLE':

                            msg = JSON.parse(newMessage.msg);

                            try {
                                const parsed = JSON.parse(msg.content);
                                msg.content = parsed;
                            } catch (error) {
                                //No problem ...
                            }

                            if (msg.role.toLowerCase() === "user") {

                                if (Array.isArray(msg.parts)) {
                                
                                    msg.parts.forEach(part => {

                                        if (part.text) {
                                            
                                            if (tempUserMsg) {
                                                // Discard temporary user message rendered
                                                tempUserMsg.remove();
                                            }

                                            this.removeLlmTyping();

                                            this.addUserMessage(part.text , newMessage.seqno, this._getDateTime(newMessage.msgDate, newMessage.msgTime) );

                                            responseData.chat.files.forEach(file => {
                                                if (file.seqno === newMessage.seqno) {
                                                    const fileObj = this._base64ToFile(file.content, file.filename, file.fileType);
                                                    this.addGhostAttachment(fileObj, file.filename, file.seqno);
                                                }
                                            });

                                        }
                                    
                                    });
                                } 
                            }

                            if (msg.role.toLowerCase() === "model") {

                                if (Array.isArray(msg.parts)) {

                                    msg.parts.forEach(part => {

                                        if (part.text) {

                                            this.removeLlmTyping();

                                            this.addLlmMessage(part.text, newMessage.seqno, this._getDateTime(newMessage.msgDate, newMessage.msgTime) );
                                        }
                                    
                                    });

                                }
                            }

                            break;

                        case 'MISTRAL':
                        case 'SAP_AI_CORE':
                        case 'DEEPSEEK':
                        case 'MOONSHOT':    
                            
                            msg = JSON.parse(newMessage.msg);

                            try {
                                const parsed = JSON.parse(msg.content);
                                msg.content = parsed;
                            } catch (error) {
                                //No problem ...
                            }

                            if (msg.role.toLowerCase() === "user") {
                                
                                if (tempUserMsg) {
                                    // Discard temporary user message rendered
                                    tempUserMsg.remove();
                                }

                                this.removeLlmTyping();

                                this.addUserMessage(msg.content, newMessage.seqno, this._getDateTime(newMessage.msgDate, newMessage.msgTime) );

                                responseData.chat.files.forEach(file => {
                                    if (file.seqno === newMessage.seqno) {
                                        const fileObj = this._base64ToFile(file.content, file.filename, file.fileType);
                                        this.addGhostAttachment(fileObj, file.filename, file.seqno);
                                    }
                                });

                            }

                            if (msg.role.toLowerCase() === "assistant" && msg.type.toLowerCase() !== "function_call" && msg.type.toLowerCase() !== "function_call_output") {

                                if (Array.isArray(msg.content)) {

                                    msg.content.forEach(contentElement => {

                                        if (element.type === "text") {

                                            this.removeLlmTyping();

                                            this.addLlmMessage(contentElement.text, newMessage.seqno );
                                        }
                                    
                                    });

                                } else {

                                    this.removeLlmTyping();

                                    this.addLlmMessage(msg.content, newMessage.seqno, this._getDateTime(newMessage.msgDate, newMessage.msgTime) );
                                }
                            }

                            break;

                        case 'OLLAMA':
                            
                            msg = JSON.parse(newMessage.msg);

                            try {
                                const parsed = JSON.parse(msg.content);
                                msg.content = parsed;
                            } catch (error) {
                                //No problem ...
                            }

                            if (msg.role.toLowerCase() === "user") {
                                
                                if (tempUserMsg) {
                                    // Discard temporary user message rendered
                                    tempUserMsg.remove();
                                }

                                this.removeLlmTyping();

                                this.addUserMessage(msg.content, newMessage.seqno, this._getDateTime(newMessage.msgDate, newMessage.msgTime) );

                                responseData.chat.files.forEach(file => {
                                    if (file.seqno === newMessage.seqno) {
                                        const fileObj = this._base64ToFile(file.content, file.filename, file.fileType);
                                        this.addGhostAttachment(fileObj, file.filename, file.seqno);
                                    }
                                });

                            }

                            if (msg.role.toLowerCase() === "assistant" && msg.tool_calls.length === 0) {

                                if (Array.isArray(msg.content)) {

                                    msg.content.forEach(contentElement => {

                                        if (element.type === "text") {

                                            this.removeLlmTyping();

                                            this.addLlmMessage(contentElement.text, newMessage.seqno );
                                        }
                                    
                                    });

                                } else {

                                    this.removeLlmTyping();

                                    this.addLlmMessage(msg.content, newMessage.seqno, this._getDateTime(newMessage.msgDate, newMessage.msgTime) );
                                }
                            }

                            break;

                        default:
                            
                            msg = JSON.parse(newMessage.msg);

                            try {
                                const parsed = JSON.parse(msg.content);
                                msg.content = parsed;
                            } catch (error) {
                                //No problem ...
                            }

                            if (msg.role.toLowerCase() === "user") {
                                
                                if (tempUserMsg) {
                                    // Discard temporary user message rendered
                                    tempUserMsg.remove();
                                }

                                this.removeLlmTyping();

                                this.addUserMessage(msg.content, newMessage.seqno, this._getDateTime(newMessage.msgDate, newMessage.msgTime) );

                            }

                            if (msg.role.toLowerCase() === "assistant" && msg.type.toLowerCase() !== "function_call" && msg.type.toLowerCase() !== "function_call_output") {

                                if (Array.isArray(msg.content)) {

                                    msg.content.forEach(contentElement => {

                                        if (element.type === "text") {

                                            this.removeLlmTyping();

                                            this.addLlmMessage(contentElement.text, newMessage.seqno );
                                        }
                                    
                                    });

                                } else {

                                    this.removeLlmTyping();

                                    this.addLlmMessage(msg.content, newMessage.seqno, this._getDateTime(newMessage.msgDate, newMessage.msgTime) );
                                }
                            }

                            break;
                    }

                });

            },

            _fetchData: async function (url, options = {}) {

				const defaultOptions = {
					method: 'GET',
					headers: {
						'Cache-Control': 'no-cache',
						'Pragma': 'no-cache',
						'Content-Type': 'application/json'
					},
					...options
				};

				try {
					const response = await fetch(url, defaultOptions);

					if (!response.ok) {
						throw new Error(`HTTP error! status: ${response.status}`);
					}

					// Handle different response types
					const contentType = response.headers.get('content-type');
					if (contentType && contentType.includes('application/json')) {
						return await response.json();
					} else {
						return await response.text();
					}
				} catch (error) {
					console.error('Error fetching data:', error);
					throw error;
				}
			},

            _getDateTime: function (msgDate, msgTime) {
                const [year, month, day] = msgDate.split('-');
                return `${day}/${month}/${year} ${msgTime}`;
            },

            _formatBytes: function(bytes) {

                if (bytes < 1024) return `${bytes} B`;

                if (bytes < 1024 * 1024)
                    return `${(bytes / 1024).toFixed(1)} KB`;

                return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
            },

            _getIcon: function(file) {
                if (file.type.startsWith("image/")) return "🖼️";
                if (file.type.startsWith("audio/")) return "🎵";
                return "📄";
            },

            _fileToBase64: async function(file) {
                const reader = new FileReader();

                const dataUrl = await new Promise((resolve, reject) => {
                reader.onload = () => resolve(reader.result);
                reader.onerror = () => reject(reader.error);

                reader.readAsDataURL(file);
                });

                // Strip the "data:<mime>;base64," prefix
                return dataUrl.split(",")[1];
            },

            _getAttachmentsAsBase64: async function() {
                return Promise.all(
                    //_attachments.values() returns a Map Iterator
                    //Using the spread operator to convert it into an array, then mapping over it
                    [...this.attachments.values()].map(async file => ({
                        filename: file.name,
                        type: file.type,
                        size: file.size,
                        content: await this._fileToBase64(file)
                    }))
                );
            },
            
            _base64ToFile: function(base64, filename, mimeType) {

                const binary = atob(base64);
                const bytes = new Uint8Array(binary.length);

                for (let i = 0; i < binary.length; i++) {
                    bytes[i] = binary.charCodeAt(i);
                }

                return new File(
                    [bytes],
                    filename,
                    {
                        type: mimeType
                    }
                );
            }
        };
    });
sap.ui.define([
    "aaic/cockpit/controller/BaseController",
    "sap/ui/core/Messaging",
    "aaic/cockpit/controller/Chat",
    "aaic/cockpit/controller/SequenceDiagram",
], (BaseController, Messaging, Chat, SequenceDiagram) => {
    "use strict";

    return BaseController.extend("aaic.cockpit.controller.Chat", {

        onInit() {

            const ownerComponent = this.getOwnerComponent();

            const router = ownerComponent.getRouter();

            router.getRoute("RouteChat").attachPatternMatched(this.onRouteMatched, this);

        },

        onRouteMatched: function (event) {

            let args = event.getParameter("arguments");

            let view = this.getView();

            let model = view.getModel("chats");

            let modelData = model.getData();

            this._id = args.id;

            if (modelData.chats) {

                let index = modelData.chats.findIndex( chat => chat.id === this._id );
                
                view.bindElement({
                    path: `/chats/${index}`,
                    model: "chats"
                });

            }

            const ownerComponent = this.getOwnerComponent();

            ownerComponent.setOnHoldNavigation();

            const sideNavigation = ownerComponent.getSideNavigation();

            if (sideNavigation) {
                sideNavigation.setSelectedKey("chats");
            }
            
            Messaging.removeAllMessages();

            const iconTabBar = view.byId("_IDChatIconTabBar");

            iconTabBar.setSelectedKey("messages");            
            
            this._loadData();

        },

        onAfterRendering: function (event) {

            const view = this.getView();

            this.setMessagePopover(view);

        },

        onAfterRenderingHTMLControlSD: async function (event) {

            let view = this.getView();

            let model = view.getModel("chats");

            let modelData = model.getData();

            let chat = {};

            if (modelData.chats) {

                let index = modelData.chats.findIndex( chat => chat.id === this._id );

                chat = modelData.chats[index];

            }

            let mermaidSequenceDiagram;

            switch (chat.api) {
                case 'OPENAI':
                    mermaidSequenceDiagram = SequenceDiagram.createMermaidSequenceDiagramOpenAI(chat);
                    break;

                case 'ANTHROPIC':
                    mermaidSequenceDiagram = SequenceDiagram.createMermaidSequenceDiagramAnthropic(chat);
                    break;
                
                case 'GOOGLE':
                    mermaidSequenceDiagram = SequenceDiagram.createMermaidSequenceDiagramGoogle(chat);
                    break;
                
                case 'MISTRAL':
                    mermaidSequenceDiagram = SequenceDiagram.createMermaidSequenceDiagramOpenAI(chat);
                    break;

                case 'OLLAMA':
                    mermaidSequenceDiagram = SequenceDiagram.createMermaidSequenceDiagramOllama(chat);
                    break;    
            
                default:
                    mermaidSequenceDiagram = "sequenceDiagram\n";
                    break;
            }
            
            const container = document.getElementById('aaic-sequence-diagram-container');
            
            let pre = document.getElementById('aaic-sequence-diagram-source-code');

            if (!pre) {
                pre = document.createElement('pre');
                pre.id = 'aaic-sequence-diagram-source-code';
                pre.className = 'mermaid';
                pre.style = 'display:none';
                pre.textContent = mermaid;
                container.appendChild(pre);
            } else {
                pre.textContent = mermaid;
            }

            let div = document.getElementById('aaic-sequence-diagram-output');

            if (!div) {
                div = document.createElement('div');
                div.id = 'aaic-sequence-diagram-output';
                div.style = 'width:100%; text-align:center';
                container.appendChild(div);
            }

            // Render accepts an ID for the temporary SVG and the code
            const { svg } = await mermaid.render('mermaidSequenceDiagram', mermaidSequenceDiagram);
            
            // Insert the SVG into the output div
            div.innerHTML = svg;
        },

        onResumeChat: function(event) {
          
            const sidePanel = Chat.getSidePanel();

            if (sidePanel) {

                const view = this.getView();

                const apiInput = view.byId("_IDChatApiInput");

                if (apiInput) {
                    
                    Chat.api = apiInput.getValue();

                    const selectApiControl = Chat.getSelectApiControl();

                    if (selectApiControl) {
                        selectApiControl.setSelectedKey(Chat.api);
                    }

                }
                
                sidePanel.setActionBarExpanded(true);
                
                Chat.resumeChat(this._id);

            }

        },

        onRefreshChat: async function() {

            await this._loadData();

            this.onAfterRenderingHTMLControlSD();

        },

        onIconTabSelect: async function(event) {

            const selectedTabKey = event.getParameter("key");

            if (selectedTabKey === "planning") {

                const view = this.getView();

                const codeEditor = view.byId("_IDChatCodeEditor");

                if (codeEditor) {
                    codeEditor.setValue("");
                } else {
                    return;
                }

                const model = view.getModel("chats");

                const modelData = model.getData();

                const index = modelData.chats.findIndex( chat => chat.id === this._id );

                const planRagId = modelData.chats[index].planRagId

                if (planRagId === ""){
                    return;
                }

                const endpoint = this.getEndpoint('rag_doc');

                view.setBusy(true);

                const responseData = await this.fetchData(endpoint + "&id=" + planRagId);

                view.setBusy(false);

                if (!responseData.document.content) {
                    return;
                }

                if (codeEditor) {
                    codeEditor.setValue(responseData.document.content);
                }

            }

        },

        onGetSequenceDiagramScreenShot: async function() {
          
            const element = document.getElementById('aaic-sequence-diagram-container');
            
            if (element) {

                const view = this.getView();
                
                view.setBusy(true);

                await html2canvas(element).then(canvas => {
                    const link = document.createElement('a');
                    link.href = canvas.toDataURL();
                    link.download = this._id + '_sd.png';
                    link.click();
                });

                view.setBusy(false);

            } else {
                console.error('Element with class "example123" not found.');
            }

        },

        //################ Private APIs ###################

        _loadData: async function() {

            const view = this.getView();

            view.setBusy(true);
         
            const endpoint = this.getEndpoint('chat');
          
            const responseData = await this.fetchData(endpoint + "&id=" + this._id);

            const chat = {
                    id: responseData.chat.id,
                    api: responseData.chat.api,
                    username: responseData.chat.username,
                    chatDate: responseData.chat.chatDate,
                    chatTime: responseData.chat.chatTime,
                    maxSeqNo: responseData.chat.maxSeqNo,
                    blocked: responseData.chat.blocked,
                    planRagId: responseData.chat.planRagId,
                    messages: responseData.chat.messages,
                    log: responseData.chat.log
                };

            let model = view.getModel("chats");

            let modelData = model.getData();

            let index = 0;

            if (!modelData.chats) {
            
                modelData.chats = [];
            
                modelData.chats.push(chat);
            
            } else {
                
                index = modelData.chats.findIndex( chat => chat.id === this._id );
                
                if(!modelData.chats[index]) {
                   
                    modelData.chats.push(chat);
                
                } else {
                    
                    modelData.chats[index] = chat;
                }

                model.setData(modelData);
            }

            view.bindElement({
                path: `/chats/${index}`,
                model: "chats"
            });

            view.setBusy(false);

        }
    });
});
sap.ui.define([
    "aaic/cockpit/controller/BaseController",
    "sap/ui/core/Messaging",
    "sap/ui/core/message/Message",
	"sap/ui/core/message/MessageType",
    "sap/m/MessageToast"
], (BaseController, Messaging, Message, MessageType, MessageToast) => {
    "use strict";

    return BaseController.extend("aaic.cockpit.controller.Document", {

        _id: "",

        _documentHasChanges: false,

        _edit: false,

        onInit() {

            const ownerComponent = this.getOwnerComponent();

            const router = ownerComponent.getRouter();

            router.getRoute("RouteDocument").attachPatternMatched(this.onRouteMatched, this);

        },

        onRouteMatched: function (event) {

            let args = event.getParameter("arguments");

            let view = this.getView();

            let model = view.getModel("rag");

            let modelData = model.getData();

            if (modelData.documents) {

                let index = modelData.documents.findIndex( document => document.id === args.id );
                
                view.bindElement({
                    path: `/documents/${index}`,
                    model: "rag"
                });

            }

            this._id = args.id;

            this._edit = false;

            this._documentHasChanges = false;

            const codeEditor = view.byId("_IDDocumentCodeEditor");

            if (codeEditor) {
                codeEditor.setValue();
            }

            this._setEditMode(this._edit);

            const ownerComponent = this.getOwnerComponent();

            ownerComponent.setOnHoldNavigation();

            const sideNavigation = ownerComponent.getSideNavigation();

            if (sideNavigation) {
                sideNavigation.setSelectedKey("documents");
            }

            Messaging.removeAllMessages();

            this._loadData();

        },

        onAfterRendering: function (event) {

            const view = this.getView();

            this.setMessagePopover(view);

        },

        onCodeEditorChange: function(event) {

            this._documentHasChanges = true;

        },

        onSaveChanges: async function (event) {

            const view = this.getView();
            
            const resourceBundle = view.getModel("i18n").getResourceBundle();

            const button = view.byId("_IDDocumentMessagePopoverButton");

            const formData = new FormData();

            Messaging.removeAllMessages();

            const document = {
                description: this.getView().getBindingContext("rag").getProperty("description"),
                keywords: this.getView().getBindingContext("rag").getProperty("keywords"),
                no_file_content: ""
            };

            if (this._documentHasChanges === true) {

                let filename = this.getView().getBindingContext("rag").getProperty("filename");
                let fileContent = "";
                
                const codeEditor = view.byId("_IDDocumentCodeEditor");

                if (codeEditor) {
                    
                    fileContent = codeEditor.getValue();

                    const fileBlob = new Blob([fileContent]);

                    formData.append('file', fileBlob, filename);
                }
                
            } else {

                document.no_file_content = "X";

                const fileBlob = new Blob();

                formData.append('file', fileBlob, 'NONE');

            }
            
            // Fill form data
            Object.keys(document).forEach(key => {
                formData.append(key, document[key]);
            });
            
            const endpoint = this.getEndpoint('rag_doc');

            try {

                // 1. Await the fetch call. This pauses execution until the response is received.
                const response = await fetch(endpoint + "&id=" + this._id, {
                    method: 'PUT',
                    body: formData
                });
                 
                if (!response.ok) {
                    // Throw an error to be caught by the catch block
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                // 2. Await the response.json() call to parse the body.
                const responseData = await response.json();

                // 3. Handle the successful data
                if (responseData.updated) {

                    MessageToast.show(resourceBundle.getText("documentUpdatedSuccessfully"));

                    const model = view.getModel("rag");

                    if (model) {
                        model.commit();
                    }

                } else {

                    const message = new Message({
                        message: resourceBundle.getText("updateError"),
                        description: responseData.error,
                        type: MessageType.Error
                    });
                
                    Messaging.addMessages(message);

                    this._fireMessagePopoverButtonPress(button);

                }

            } catch (error) {
                // 4. Handle any errors during the fetch or parsing process
                console.error('Operation failed:', error);
                // Optional: Re-throw the error or return a specific value/state
                //throw error; 
            }

        },

        onToogleEdit: function(event) { 

            this._edit = !this._edit;

            this._setEditMode(this._edit);

        },

        onNavBack: function(event) { 

            const view = this.getView();

            this._edit = false;

            const descriptionInput = view.byId("_IDDocumentDescriptionInput");

            descriptionInput.setEditable(this._edit);

            const keywordsInput = view.byId("_IDDocumentKeywordsInput");

            keywordsInput.setEditable(this._edit);

            const codeEditor = view.byId("_IDDocumentCodeEditor");

            codeEditor.setEditable(this._edit);

            this.onNavBackMaster('RouteDocuments');

        },

        //################ Private APIs ###################

        _loadData: async function() {
         
            const view = this.getView();

            view.setBusy(true);

            const endpoint = this.getEndpoint('rag_doc');
          
            const responseData = await this.fetchData(endpoint + "&id=" + this._id);

            let model = view.getModel("rag");

            let modelData = model.getData();

            let index = 0;

            if (!modelData.documents) {
            
                modelData.documents = [];
            
                modelData.documents.push({
                    id: responseData.document.id,
                    filename: responseData.document.filename,
                    description: responseData.document.description,
                    keywords: responseData.document.keywords,
                    content: responseData.document.content
                });
            
            } else {
                
                index = modelData.documents.findIndex( document => document.id === this._id );
                
                if(!modelData.documents[index]) {
                   
                    modelData.documents.push({
                        id: responseData.document.id,
                        filename: responseData.document.filename,
                        description: responseData.document.description,
                        keywords: responseData.document.keywords,
                        content: responseData.document.content
                    });
                
                } else {
                    
                    modelData.documents[index].id = responseData.document.id;
                    modelData.documents[index].filename = responseData.document.filename;
                    modelData.documents[index].description = responseData.document.description;
                    modelData.documents[index].keywords = responseData.document.keywords;
                    modelData.documents[index].content = responseData.document.content;
                }

                model.setModelData(modelData);
            }

            view.bindElement({
                path: `/documents/${index}`,
                model: "rag"
            });

            const codeEditor = view.byId("_IDDocumentCodeEditor");

            if (codeEditor) {
                codeEditor.setValue(responseData.document.content);
            }

            view.setBusy(false);

        },

        _setEditMode: function(editable) { 

            const view = this.getView();

            const idsEditable = ["_IDDocumentDescriptionInput", "_IDDocumentKeywordsInput", "_IDDocumentCodeEditor"];

            const idsEnable = ["_IDDocumentButtonSave"];                

            idsEditable.forEach(id => {
                let control = view.byId(id);
                if (control) {
                    control.setEditable(editable);
                }
            });
            
            idsEnable.forEach(id => {
                let control = view.byId(id);
                if (control) {
                    control.setEnabled(editable);
                }
            });

        }

    });
});
sap.ui.define([
    "aaic/cockpit/controller/BaseController",
    "sap/ui/core/UIComponent",
    "sap/ui/core/Messaging",
    "sap/m/Dialog",
	"sap/m/Button",
    "sap/m/Text",
    "sap/m/MessageToast",
    "sap/m/IllustratedMessage",
    "sap/m/IllustratedMessageType",
    "sap/ui/core/message/Message",
    "sap/ui/core/message/MessageType",
    "sap/m/MessageBox"
], (BaseController, UIComponent, Messaging, Dialog, Button, Text, MessageToast, IllustratedMessage, IllustratedMessageType, Message, MessageType, MessageBox) => {
    "use strict";

    return BaseController.extend("aaic.cockpit.controller.Documents", {
        
        onInit() {
        
            const ownerComponent = this.getOwnerComponent();

            const router = ownerComponent.getRouter();

            router.getRoute("RouteDocuments").attachPatternMatched(this.onRouteMatched, this);
        },

        onRouteMatched: function (event) {

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

            const table = view.byId("_IDDocumentsTable");

            const illustratedMessage = new IllustratedMessage();

            illustratedMessage.setIllustrationType(IllustratedMessageType.NoData);
            illustratedMessage.setIllustrationSize(sap.m.IllustratedMessageSize.Medium);

            table.setNoData(illustratedMessage);

        },

        onItemPress: function (event) {
                
            const id = event.getSource().getBindingContext("rag").getProperty("id");
         
            const router = UIComponent.getRouterFor(this);
            
            router.navTo("RouteDocument", { id: id });
            
        },

        onSearch: function () {
            
            const view = this.getView();
            
            const filename = view.byId("_IDDocumentsFilenameFilter").getValue();
            const description = view.byId("_IDDocumentsDescriptionFilter").getValue();
            const keywords = view.byId("_IDDocumentsKeywordsFilter").getValue();
                        
            this._loadData(filename, description, keywords);

        },

        onAdd: function (event) {
            
            this.onOpenDialog();   

        },

        onDelete: function (event) {
            
            const view = this.getView();

            const table = view.byId("_IDDocumentsTable");

            const selectedItems = table.getSelectedItems();

            const resourceBundle = view.getModel("i18n").getResourceBundle();

            const selectedIds = [];

            if (selectedItems.length > 0) {

                selectedItems.forEach(element => {
                    selectedIds.push(element.getBindingContext("rag").getProperty("id"));
                }); 

                if (!this._confirmDialog) {
                    
                    this._confirmDialog = new Dialog({
                        id: "_IDDocumentConfirmDialog",
                        type: "Message",
                        title: resourceBundle.getText("confirm"),
                        content: new Text({ text: resourceBundle.getText("confirmDeleteDocuments") }),
                        beginButton: new Button({
                            type: "Emphasized",
                            text: resourceBundle.getText("yes"),
                            press: function () {
                                view.setBusy(true);
                                if (table) {
                                    table.removeSelections();
                                }        
                                this._deleteDocuments(selectedIds, view);
                                this._confirmDialog.close();
                            }.bind(this)
                        }),
                        endButton: new Button({
                            text: resourceBundle.getText("cancel"),
                            press: function () {
                                this._confirmDialog.close();
                            }.bind(this)
                        })
                    });
                }

                this._confirmDialog.open();

            }

        },

        async onOpenDialog() {

			// Create dialog lazily
			this.Dialog ??= await this.loadFragment({
				name: "aaic.cockpit.fragment.UploadDialog",
                controller: this
			});

			this.Dialog.open();
		},

        onCloseDialog: function(event) {
            
            const fileUploader = this.byId("_IDUploadFileUploader");
            
            fileUploader.clear();
            
            this.Dialog.close();
        },

        handleFileChange : function(event) {
            
            this._file = event.getParameter("files") && event.getParameter("files")[0];
        
        },

        handleFileTypeMissmatch: function(event) {
            
            const view = this.getView();

            const resourceBundle = view.getModel("i18n").getResourceBundle();

            MessageToast.show(resourceBundle.getText("markdownFilesOnly"));
        
        },

        handleUploadPress: function(event) {

            if (!this._file) {
                return;
            }

            Messaging.removeAllMessages();

            const view = this.getView();

            this.Dialog.setBusy(true);

            var that = this;
            
            const fileUploader = this.byId("_IDUploadFileUploader");
			
            fileUploader.checkFileReadable().then(async function() {

                let responseData;
                let description = that.byId("_IDUploadDescriptionInput");
                let keywords = that.byId("_IDUploadKeywordsInput");

                try {

                    responseData = await that._uploadDocument({ 
                        description: description.getValue(),
                        keywords: keywords.getValue()
                    });

                    that.Dialog.setBusy(false);
                    
                } catch (error) {
                    
                    console.log('Failed to upload document:', error);

                    that.Dialog.setBusy(false);

                    MessageBox.error(error.message);

                    const resourceBundle = view.getModel("i18n").getResourceBundle();

                    const message = new Message({
                        message: error.message,
                        description: resourceBundle.getText("uploadError"),
                        type: MessageType.Error
                    });
                    
                    Messaging.addMessages(message);
                }

                if (responseData.created === true) {
                    
                    that.Dialog.setBusy(false);

                    that._addFile(that.getView().getModel("rag"),
                                responseData.id,
                                description.getValue(),
                                keywords.getValue(),
                                that._file);
                        
                    description.setValue("");
                    keywords.setValue("");
                    
                    that.Dialog.close();

                } else {

                    that.Dialog.setBusy(false);

                    MessageBox.error(responseData.error);

                    const resourceBundle = view.getModel("i18n").getResourceBundle();

                    const message = new Message({
                        message: responseData.error,
                        description: resourceBundle.getText("uploadError"),
                        type: MessageType.Error
                    });
                    
                    Messaging.addMessages(message);

                }

			}, function(error) {

                that.Dialog.setBusy(false);

                const resourceBundle = view.getModel("i18n").getResourceBundle();

                MessageBox.error(resourceBundle.getText("fileReadError") + error.message);

                const message = new Message({
                    message: responseData.error,
                    description: resourceBundle.getText("fileReadError") + error.message,
                    type: MessageType.Error
                });
                
                Messaging.addMessages(message);

			}).then(function() {
				fileUploader.clear();
			});
        },

        //################ Private APIs ###################

        _loadData: async function(filename = "", description = "", keywords = "") {
         
            const view = this.getView();

            view.setBusy(true);

            let model = view.getModel("rag");

            const endpoint = this.getEndpoint('rag_doc');
          
            try {
            
                const modelData = await this.fetchData(endpoint  + "&filename=" + filename + "&description=" + description + "&keywords=" + keywords);

                model.setModelData(modelData);

                view.setBusy(false);

            } catch (error) {

                view.setBusy(false);

                MessageBox.error(error.message);

                const resourceBundle = view.getModel("i18n").getResourceBundle();

                const message = new Message({
                    message: error.message,
                    description: resourceBundle.getText("communicationError"),
                    type: MessageType.Error
                });
                
                Messaging.addMessages(message);

            }

        },

        _addFile: function(model, id, description, keywords, data) {
            
            let modelData = model.getData();
            
            modelData.documents = modelData.documents || [];
            
            modelData.documents.push({
                id: id,
                filename: data.name,
                description: description,
                keywords: keywords
            });
            
            model.setModelData(modelData);
        
        },

        _uploadDocument: async function(metadata) {

            if (!this._file){
                return;
            }
           
            const fileArrayBuffer = await this._file.arrayBuffer();

            const formData = new FormData();

            const fileBlob = new Blob([fileArrayBuffer]);
            
            formData.append('file', fileBlob, this._file.name);

            // Add metadata
            Object.keys(metadata).forEach(key => {
                formData.append(key, metadata[key]);
            });

            const endpoint = this.getEndpoint('rag_doc');

            try {

                // 1. Await the fetch call. This pauses execution until the response is received.
                const response = await fetch(endpoint, {
                    method: 'POST',
                    body: formData
                });
                 
                if (!response.ok) {
                    // Throw an error to be caught by the catch block
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                // 2. Await the response.json() call to parse the body.
                const responseData = await response.json();

                // 3. Handle the successful data
                if (responseData.created === true) {
                    console.log('Document uploaded successfully!', responseData);
                } else {
                    throw new Error(`Document upload failed! error: ${responseData.error}`);
                }
                
                // Return the data if needed by the caller
                return responseData;

            } catch (error) {
                
                // 4. Handle any errors during the fetch or parsing process
                console.log(error.message);
                throw error;
               
            }

        },

        _deleteDocuments: async function(selectedIds, view) {
         
            const model = view.getModel("rag");
            
            const modelData = model.getData();

            for (const id of selectedIds) {
                
                const endpoint = this.getEndpoint('rag_doc') + '&id=' + id;

                try {

                    // 1. Await the fetch call. This pauses execution until the response is received.
                    const response = await fetch(endpoint, {
                        method: 'DELETE'
                    });
                    
                    if (!response.ok) {
                        // Throw an error to be caught by the catch block
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                                       
                    // 2. Await the response.json() call to parse the body.
                    const responseData = await response.json();
                    
                    // 3. Handle the successful data
                    if ( responseData.error === "" ) {
                        console.log('Document deleted successfully!', responseData);
                    } else {
                        throw new Error(`Document deletion failed! error: ${responseData.error}`);
                    }
 
                } catch (error) {
                    
                    // 4. Handle any errors during the fetch or parsing process
                    console.log(error);

                    MessageBox.error(error.message);

                    const resourceBundle = view.getModel("i18n").getResourceBundle();

                    const message = new Message({
                        message: error.message,
                        description: resourceBundle.getText("deleteError"),
                        type: MessageType.Error
                    });
                    
                    Messaging.addMessages(message);

                    break;
                }

                const documents = modelData.documents.filter((document) => document.id !== id );

                modelData.documents = documents;

                model.setModelData(modelData);

            }; 

            view.setBusy(false);
        
        }

    });
});
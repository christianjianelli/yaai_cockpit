sap.ui.define([
    "aaic/cockpit/controller/BaseController",
    "sap/ui/core/Messaging",
    "sap/ui/core/message/Message",
	"sap/ui/core/message/MessageType",
    "sap/ui/model/Filter",
	"sap/ui/model/FilterOperator",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], (BaseController, Messaging, Message, MessageType, Filter, FilterOperator, MessageToast, MessageBox) => {
    "use strict";

    return BaseController.extend("aaic.cockpit.controller.Agent", {
        
        _id: "",

        _valueHelpInputId: "",

        _addDocVHRequest: false,

        _hasChanges: false,

        _edit: false,

        _apis: ["OPENAI", "ANTHROPIC", "GOOGLE", "MISTRAL", "OLLAMA"],

        _selectedApi: 0,

        onInit() {
        
            const ownerComponent = this.getOwnerComponent();

            const router = ownerComponent.getRouter();

            router.getRoute("RouteAgent").attachPatternMatched(this.onRouteMatched, this);
        
        },

        onRouteMatched: function (event) {

            let args = event.getParameter("arguments");

            let view = this.getView();

            let model = view.getModel("agents");

            let modelData = model.getData();

            let index = -1;

            if (modelData.agents) {

                index = modelData.agents.findIndex( agent => agent.id === args.id );

                view.bindElement({
                    path: `/agents/${index}`,
                    model: "agents"
                });
            }

            this._id = args.id;

            this._edit = model.hasChanges();

            this._setEditMode(this._edit);

            const ownerComponent = this.getOwnerComponent();

            ownerComponent.setOnHoldNavigation();

            const sideNavigation = ownerComponent.getSideNavigation();

            if (sideNavigation) {
                sideNavigation.setSelectedKey("agents");
            }

            Messaging.removeAllMessages();

            if (!this._edit) {
                this._loadData();
            }
        },

        onAfterRendering: function (event) {

            const view = this.getView();

            this.setMessagePopover(view);

        },

        onToogleEdit: function(event) {
            
            this._edit = !this._edit;
            
            this._setEditMode(this._edit);
        },

        onSaveChanges: async function(event) {

            const view = this.getView();

            const resourceBundle = view.getModel("i18n").getResourceBundle();

            Messaging.removeAllMessages();
            
            view.setBusy(true);

            const model = view.getModel("agents");

            const modelData = model.getData();

            const index = modelData.agents.findIndex( agent => agent.id === this._id );

            let agent = modelData.agents[index];
            
            if ( agent.name === "" || agent.description === "") {

                MessageToast.show(resourceBundle.getText("fillAllRequiredFields"));

                this.Dialog.setBusy(false);

                return;
            }
            
            const endpoint = this.getEndpoint('agent');

            try {

                // 1. Await the fetch call. This pauses execution until the response is received.
                const response = await fetch(endpoint, {
                    method: 'PUT',
                    body: JSON.stringify(agent)
                });
                 
                if (!response.ok) {
                    // Throw an error to be caught by the catch block
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                // 2. Await the response.json() call to parse the body.
                const responseData = await response.json();

                // 3. Handle the successful data

                if (responseData.updated === true) {
                    
                    console.log('Agent updated:', responseData);

                    MessageToast.show(resourceBundle.getText("agentUpdated"));

                } else {

                    console.error('Update failed:', responseData);

                    const message = new Message({
                        message: responseData.error,
                        type: MessageType.Error
                    });
                    
                    Messaging.addMessages(message);

                    view.setBusy(false);

                    this.openMessagePopover(event);	

                    return;

                }
                
                this._loadData();

            } catch (error) {

                // 4. Handle any errors during the fetch or parsing process
                const message = new Message({
                    message: error,
                    type: MessageType.Error
                });
                
                Messaging.addMessages(message);

                view.setBusy(false);

                this.openMessagePopover(event);	

                console.error('Operation failed:', error);

                return;
            }

            view.setBusy(false);

        },

        onDocumentValueHelpRequest: async function(event) {

            this._addDocVHRequest = false;
            this._valueHelpInputId = event.getSource().getId();

            if ( this._valueHelpInputId.includes("_IDAgentButtonAddDoc")) {
                this._valueHelpInputId = "";
                this._addDocVHRequest = true;
            } 

			// Create dialog lazily
			this.DocumentVHDialog ??= await this.loadFragment({
				name: "aaic.cockpit.fragment.DocumentValueHelp",
                controller: this
			});

			this.DocumentVHDialog.open();

            this.DocumentVHDialog.setBusy(true);
            
            try {
            
                await this._loadDocumentsData(this.getView());

                this.DocumentVHDialog.setBusy(false);
                
            } catch (error) {

                this.DocumentVHDialog.setBusy(false);

                const message = new Message({
                    message: error.message,
                    type: MessageType.Error
                });
                
                Messaging.addMessages(message);

            }
		},

        onDocumentValueHelpDialogClose: function (event) {

            const selectedItem = event.getParameter("selectedItem");

            if (!selectedItem) {
				return;
			}

            if (this._valueHelpInputId !== "" ) {

                const input = this.byId(this._valueHelpInputId);

                if (input) {

                    const filename = selectedItem.getBindingContext("rag").getProperty("filename");

                    input.setValue(filename);

                }

                return;
            }
		
            if (this._addDocVHRequest === true) {

                const view = this.getView();

                const model = view.getModel("agents");

                const modelData = model.getData();

                const index = modelData.agents.findIndex( agent => agent.id === this._id );

                const ragId = selectedItem.getBindingContext("rag").getProperty("id");
                const filename = selectedItem.getBindingContext("rag").getProperty("filename");
                const description = selectedItem.getBindingContext("rag").getProperty("description");

                modelData.agents[index].docs.push({
                    ragId: ragId,
                    filename: filename,
                    description: description
                });

                model.updateModelData(modelData);
            }
		},

        onToolValueHelpRequest: async function(event) {

            this._valueHelpInputId = event.getSource().getId();

			// Create dialog lazily
			this.ToolVHDialog ??= await this.loadFragment({
				name: "aaic.cockpit.fragment.ToolValueHelp",
                controller: this
			});

			this.ToolVHDialog.open();

            this.ToolVHDialog.setBusy(true);
            
            try {
                
                await this._loadToolsData(this.getView());

                this.ToolVHDialog.setBusy(false);

            } catch (error) {

                this.ToolVHDialog.setBusy(false);

                const message = new Message({
                    message: error.message,
                    type: MessageType.Error
                });
                
                Messaging.addMessages(message);

            }

		},

        onToolValueHelpDialogClose: function (event) {

            const selectedItem = event.getParameter("selectedItem");

			const input = this.byId(this._valueHelpInputId);

			if (!selectedItem) {
				return;
			}

            const className = selectedItem.getBindingContext("tools").getProperty("className");
            const methodName = selectedItem.getBindingContext("tools").getProperty("methodName");
            const proxyClass = selectedItem.getBindingContext("tools").getProperty("proxyClass");
            const description = selectedItem.getBindingContext("tools").getProperty("description");

            const view = this.getView();

            const model = view.getModel("agents");

            const modelData = model.getData();

            const index = modelData.agents.findIndex( agent => agent.id === this._id );

            modelData.agents[index].tools.push({
                className: className,
                methodName: methodName,
                proxyClass: proxyClass,
                description: description
            });

            model.updateModelData(modelData);

		},

        onOpenAddModelDialog: async function() {

            // Create dialog lazily
			this.AddModelDialog ??= await this.loadFragment({
				name: "aaic.cockpit.fragment.AddAgentModel",
                controller: this
			});

			this.AddModelDialog.open();

            const view = this.getView();

            const apis = view.getModel("apis");

            let apisModelData = apis.getData();

            if (!apisModelData.apis) {
                
                const endpoint = this.getEndpoint('llm_api');
                
                view.setBusy(true);
                
                apisModelData = await this.fetchData(endpoint);           
                
                apis.setModelData(apisModelData);
                
                const modelsvh = view.getModel("modelsvh");

                apisModelData.apis.forEach(element => {
                    if (element.id === this._apis[this._selectedApi]) {
                        modelsvh.setData(element);
                    }
                });

                view.setBusy(false);
            }

			
		},

        onCloseAddModelDialog: function(event) {
            this.AddModelDialog.close();
        },

        onDelete: function(event) {

            const view = this.getView();

            const table = view.byId("_IDAgentToolsTable");

            const model = view.getModel("agents");
            
            const modelData = model.getData();

            const selectedItems = table.getSelectedItems();

            const selectedTools = [];

            const index = modelData.agents.findIndex( agent => agent.id === this._id );

            if (selectedItems.length > 0) {

                selectedItems.forEach(element => {
                    selectedTools.push({ 
                        className: element.getBindingContext("agents").getProperty("className"),
                        methodName: element.getBindingContext("agents").getProperty("methodName")
                    });
                }); 

                for (const selectedTool of selectedTools) {

                    // Remove deleted tool from the local JSON Model
                    modelData.agents[index].tools = modelData.agents[index].tools.filter((tool) => !(tool.className === selectedTool.className && tool.methodName === selectedTool.methodName));

                    model.updateModelData(modelData);

                }

                table.removeSelections();

            }

        },

        onDeleteModel: function(event) {

            const view = this.getView();

            const table = view.byId("_IDAgentModelsTable");

            const model = view.getModel("agents");
            
            const modelData = model.getData();

            const selectedItems = table.getSelectedItems();

            const selectedModels = [];

            const index = modelData.agents.findIndex( agent => agent.id === this._id );

            if (selectedItems.length > 0) {

                selectedItems.forEach(element => {
                    selectedModels.push({ 
                        api: element.getBindingContext("agents").getProperty("api")
                    });
                }); 

                for (const selectedModel of selectedModels) {

                    // Remove deleted model from the local JSON Model
                    modelData.agents[index].models = modelData.agents[index].models.filter((model) => model.api !== selectedModel.api );

                    model.updateModelData(modelData);

                }

            }

        },

        onDeleteDocument: function(event) {

            const view = this.getView();

            const table = view.byId("_IDAgentDocsTable");

            const model = view.getModel("agents");
            
            const modelData = model.getData();

            const selectedItems = table.getSelectedItems();

            const selectedDocs = [];

            const index = modelData.agents.findIndex( agent => agent.id === this._id );

            if (selectedItems.length > 0) {

                selectedItems.forEach(element => {
                    selectedDocs.push({ 
                        ragId: element.getBindingContext("agents").getProperty("ragId")
                    });
                }); 

                for (const selectedDocument of selectedDocs) {

                    // Remove deleted document from the local JSON Model
                    modelData.agents[index].docs = modelData.agents[index].docs.filter((document) => document.ragId !== selectedDocument.ragId );

                    model.updateModelData(modelData);

                }

            }

        },

        onApiSelect: function(event) {

            let visibility = true;

            const selectedIndex = event.getSource().getSelectedIndex();

            this._selectedApi = selectedIndex;

            if (selectedIndex !== 0) {
                visibility = false;
            }

            const view = this.getView();

            view.byId("_IDAddAgentModelLabelVerbosity").setVisible(visibility);
            view.byId("_IDAddAgentModelRBGVerbosity").setVisible(visibility);
            
            view.byId("_IDAddAgentModelLabelReasoning").setVisible(visibility);
            view.byId("_IDAddAgentModelRBGReasoning").setVisible(visibility);

            const apiModel = view.getModel("apis");

            const apiModelData = apiModel.getData();

            const modelsvh = view.getModel("modelsvh");

            apiModelData.apis.forEach(element => {
                if (element.id === this._apis[selectedIndex]) {
                    modelsvh.setData(element);
                }
            });

        },

        onAddAgentModel: function(event) {

            const verbosity = ["low", "medium", "high"];
            const reasoning = ["minimal", "low", "medium", "high"];
            
            const view = this.getView();
            const table = view.byId("_IDAgentModelsTable");
            const apiRBG = view.byId("_IDAddAgentModelRBGApi");
            const modelInput = view.byId("_IDAddAgentModelInputModel");
            const temperatureSlider = view.byId("_IDAddAgentModelSliderTemperature");
            const verbosityRBG = view.byId("_IDAddAgentModelRBGVerbosity");
            const reasoningRBG = view.byId("_IDAddAgentModelRBGReasoning");
            const maxToolCallsSlider = view.byId("_IDAddAgentModelSliderMaxToolCalls");

            table.removeSelections();

            let agentModel = {
                api: this._apis[apiRBG.getSelectedIndex()],
                model: modelInput.getValue(),
                temperature: temperatureSlider.getValue(),
                verbosity: verbosity[verbosityRBG.getSelectedIndex()],
                reasoning: reasoning[reasoningRBG.getSelectedIndex()],
                maxToolCalls: maxToolCallsSlider.getValue()
            };

            if (agentModel.model === "") {
                const resourceBundle = view.getModel("i18n").getResourceBundle();
                MessageToast.show(resourceBundle.getText("llmModelFieldRequired"));
                return;
            }
            
            const model = view.getModel("agents");

            const modelData = model.getData();

            const index = modelData.agents.findIndex( agent => agent.id === this._id );

            modelData.agents[index].models.push(agentModel);

            model.updateModelData(modelData);

            apiRBG.setSelectedIndex(0)
            modelInput.setValue("");
            temperatureSlider.setValue(1);
            verbosityRBG.setSelectedIndex(0);
            reasoningRBG.setSelectedIndex(0);
            maxToolCallsSlider.setValue(5);
            
            this.AddModelDialog.close();

        },

        onSearchTool: function (event) {
			const value = event.getParameter("value");
			const filter = new Filter({
                filters: [
                    new Filter({
                        path: 'className',
                        operator: FilterOperator.Contains,
                        value1: value
                    }),
                    new Filter({
                        path: 'methodName',
                        operator: FilterOperator.Contains,
                        value1: value
                    })
                ],
                and: false
            });
			var binding = event.getParameter("itemsBinding");
			binding.filter([filter]);
		},

        onToggleLoadOnDemand: function() {

            const view = this.getView();

            const table = view.byId("_IDAgentToolsTable");

            const model = view.getModel("agents");
            
            const modelData = model.getData();

            const selectedItems = table.getSelectedItems();

            const index = modelData.agents.findIndex( agent => agent.id === this._id );

            if (selectedItems.length > 0) {

                selectedItems.forEach(element => {

                    let className = element.getBindingContext("agents").getProperty("className");
                    let methodName = element.getBindingContext("agents").getProperty("methodName");

                    modelData.agents[index].tools.forEach(tool => {

                        if (tool.className === className && tool.methodName === methodName) {

                            tool.loadOnDemand = !tool.loadOnDemand;

                        }

                    });    

                }); 

                model.updateModelData(modelData);

            }

        },

        //################ Private APIs ###################

        _loadData: async function() {
            
            const view = this.getView();

            view.setBusy(true);

            const endpoint = this.getEndpoint('agent');

            let agent = {};

            try {
              
                const responseData = await this.fetchData(endpoint + "&id=" + this._id);

                agent = { id: responseData.agent.id,
                          name: responseData.agent.name,
                          description: responseData.agent.description,
                          sysInstId: responseData.agent.sysInstId,
                          filenameSi: responseData.agent.filenameSi,
                          fileSiDescr: responseData.agent.fileSiDescr,
                          ragCtxId: responseData.agent.ragCtxId,
                          filenameCtx: responseData.agent.filenameCtx,
                          fileCtxDescr: responseData.agent.fileCtxDescr,
                          promptTemplate: responseData.agent.promptTemplate,
                          tools: responseData.agent.tools,
                          docs: responseData.agent.docs,
                          models: responseData.agent.models  
                    };

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

                return;
            }

            let model = view.getModel("agents");

            let modelData = model.getData();

            let index = 0;

            if (!modelData.agents) {
            
                modelData.agents = [];
            
                modelData.agents.push(agent);
            
            } else {
                
                index = modelData.agents.findIndex( agent => agent.id === this._id );
                
                if(!modelData.agents[index]) {
                   
                    modelData.agents.push(agent);
                
                } else {
                    
                    modelData.agents[index] = agent;

                }

            }

            model.setModelData(modelData);

            view.bindElement({
                path: `/agents/${index}`,
                model: "agents"
            });

            view.setBusy(false);

        },

        _loadDocumentsData: async function(view) {
         
            let model = view.getModel("rag");

            const endpoint = this.getEndpoint('rag_doc');
          
            const modelData = await this.fetchData(endpoint);

            model.setModelData(modelData);
        },

        _loadToolsData: async function(view) {
         
            let model = view.getModel("tools");

            const endpoint = this.getEndpoint('llm_tool');
          
            const modelData = await this.fetchData(endpoint);

            model.setModelData(modelData);
        },

        _setEditMode: function(editable) {

            const view = this.getView();

            const idsEditable = ["_IDAgentNameInput", 
                                 "_IDAgentDescriptionInput", 
                                 "_IDAgentFilenameSystemInstructionsInput",
                                 "_IDAgentFilenameContextInput",
                                 "_IDAgentPromptTemplateInput"];

            const idsEnable = ["_IDAgentButtonAdd", 
                               "_IDAgentButtonDelete", 
                               "_IDAgentButtonSave", 
                               "_IDAgentButtonAddModel", 
                               "_IDAgentButtonLoadOnDemand", 
                               "_IDAgentButtonDeleteModel",
                               "_IDAgentButtonAddDoc",
                               "_IDAgentButtonDeleteDoc"];                

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
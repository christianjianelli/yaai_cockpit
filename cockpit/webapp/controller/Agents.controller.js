sap.ui.define([
    "aaic/cockpit/controller/BaseController",
    "sap/ui/core/UIComponent",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Text",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/IllustratedMessage",
    "sap/m/IllustratedMessageType",
    "sap/ui/core/Messaging",
    "sap/ui/core/message/Message",
	"sap/ui/core/message/MessageType"
], (BaseController, UIComponent, Dialog, Button, Text, MessageToast, MessageBox, IllustratedMessage, IllustratedMessageType, Messaging, Message, MessageType) => {
    "use strict";

    return BaseController.extend("aaic.cockpit.controller.Agents", {
        
        onInit() {

            const ownerComponent = this.getOwnerComponent();

            const router = ownerComponent.getRouter();

            router.getRoute("RouteAgents").attachPatternMatched(this.onRouteMatched, this);            
        
        },

        onRouteMatched: function (event) {
           
            const ownerComponent = this.getOwnerComponent();

            ownerComponent.setOnHoldNavigation();

            const sideNavigation = ownerComponent.getSideNavigation();

            if (sideNavigation) {
                sideNavigation.setSelectedKey("agents");
            }

            Messaging.removeAllMessages();

            this._loadData();
            
        },

        onAfterRendering: function (event) {

            const view = this.getView();

            this.setMessagePopover(view);

            const table = view.byId("_IDAgentsTable");

            const illustratedMessage = new IllustratedMessage();

            illustratedMessage.setIllustrationType(IllustratedMessageType.NoData);
            illustratedMessage.setIllustrationSize(sap.m.IllustratedMessageSize.Medium);

            table.setNoData(illustratedMessage);

        },

        onItemPress: function (event) {
                
            const id = event.getSource().getBindingContext("agents").getProperty("id");
            
            const router = UIComponent.getRouterFor(this);
            
            router.navTo("RouteAgent", { id: id });
            
        },

        onSearch: function (event) {

            const view = this.getView();

            const agentName = view.byId("_IDAgentsNameFilter").getValue();
            const description = view.byId("_IDAgentsDescriptionFilter").getValue();
                        
            this._loadData(agentName, description);

        },

        onAdd: function (event) {
            
            this.onOpenDialog();   

        },

        onDelete: function (event) {

            const view = this.getView();

            const table = view.byId("_IDAgentsTable");

            const selectedItems = table.getSelectedItems();

            const resourceBundle = view.getModel("i18n").getResourceBundle();

            const selectedAgents = [];

            if (selectedItems.length > 0) {

                selectedItems.forEach(element => {
                    selectedAgents.push({ 
                        id: element.getBindingContext("agents").getProperty("id")
                    });
                }); 

                if (!this._confirmDialog) {
                    
                    this._confirmDialog = new Dialog({
                        id: "_IDAgentsConfirmDialogDelete",
                        type: "Message",
                        title: resourceBundle.getText("confirm"),
                        content: new Text({ text: resourceBundle.getText("confirmDeleteAgents") }),
                        beginButton: new Button({
                            type: "Emphasized",
                            text: resourceBundle.getText("yes"),
                            press: function () {              
                                this._confirmDialog.setBusy(true);              
                                this._deleteAgents(selectedAgents, view);
                                this._confirmDialog.setBusy(false);
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

        onOpenDialog: async function () {

			// Create dialog lazily
			this.Dialog ??= await this.loadFragment({
				name: "aaic.cockpit.fragment.AddAgent",
                controller: this
			});

			this.Dialog.open();
		},

        onCloseDialog: function(event) {            
            
            this.Dialog.close();
        
        },

        onAddAgent: async function (event) {

            const view = this.getView();

            const resourceBundle = view.getModel("i18n").getResourceBundle();

            Messaging.removeAllMessages();
            
            this.Dialog.setBusy(true);

            const agent = {
                name: view.byId("_IDAddAgentInputName").getValue(),
                description: view.byId("_IDAddAgentInputDescription").getValue()
            };

            if ( agent.name === "" || agent.description === "") {

                MessageToast.show(resourceBundle.getText("fillAllRequiredFields"));

                this.Dialog.setBusy(false);

                return;
            }
            
            const endpoint = this.getEndpoint('agent');

            try {

                // 1. Await the fetch call. This pauses execution until the response is received.
                const response = await fetch(endpoint, {
                    method: 'POST',
                    body: JSON.stringify(agent)
                });
                 
                if (!response.ok) {
                    // Throw an error to be caught by the catch block
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                // 2. Await the response.json() call to parse the body.
                const responseData = await response.json();

                // 3. Handle the successful data

                if (responseData.created === true) {
                    
                    console.log('Agent created:', responseData);

                    MessageToast.show(resourceBundle.getText("agentCreated"));

                } else {

                    console.error('Delete failed:', responseData);

                    const message = new Message({
                        message: responseData.error,
                        type: MessageType.Error
                    });
                    
                    Messaging.addMessages(message);

                    this.Dialog.setBusy(false);

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

                this.Dialog.setBusy(false);

                this.openMessagePopover(event);	

                console.error('Operation failed:', error);

                return;
            }

            // Reset fields
            view.byId("_IDAddAgentInputName").setValue("");
            view.byId("_IDAddAgentInputDescription").setValue("");

            this.Dialog.setBusy(false);

            this.Dialog.close();

        },

        //################ Private APIs ###################

        _loadData: async function(agentName = "", description = "") {

            const view = this.getView();

            view.setBusy(true);
         
            const model = view.getModel("agents");

            const endpoint = this.getEndpoint('agent');

            try {
          
                const modelData = await this.fetchData(endpoint + "&agent_name=" + agentName + "&agent_description=" + description);

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

        _deleteAgents: async function(selectedAgents, view) {

            view.setBusy(true); 
         
            const model = view.getModel("agents");
            
            const modelData = model.getData();

            for (const selectedAgent of selectedAgents) {
                
                const endpoint = this.getEndpoint('agent') + '&id=' + selectedAgent.id;

                try {

                    // 1. Await the fetch call. This pauses execution until the response is received.
                    const response = await fetch(endpoint, {
                        method: 'DELETE'
                    });
                    
                    if (!response.ok) {
                        // Throw an error to be caught by the catch block
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                   
                    // Remove deleted agent from the local JSON Model
                    modelData.agents = modelData.agents.filter((agent) => agent.id !== selectedAgent.id );

                    model.setModelData(modelData);
                    
                    // 2. Await the response.json() call to parse the body.
                    const responseData = await response.json();
                    
                    // 3. Handle the successful data
                    if ( responseData.error === "" ) {
                        
                        const resourceBundle = view.getModel("i18n").getResourceBundle();

                        MessageToast.show(resourceBundle.getText("agentDeleted"));

                    } else {
                        // Throw an error to be caught by the catch block
                        throw new Error(responseData.error);
                    }
 
                } catch (error) {

                    // 4. Handle any errors during the fetch or parsing process
                    const message = new Message({
                        message: error.message,
                        type: MessageType.Error
                    });
                    
                    Messaging.addMessages(message);

                    MessageBox.error(error.message);

                    break;
                }
            }; 

            view.setBusy(false);
        
        }
    });
});
sap.ui.define([
    "aaic/cockpit/controller/BaseController",
    "sap/ui/core/UIComponent",
    "sap/m/IllustratedMessage",
    "sap/m/IllustratedMessageType",
    "sap/ui/core/Messaging",
    "sap/ui/core/message/Message",
    "sap/ui/core/message/MessageType",
    "sap/m/MessageBox",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Text"
], (BaseController, UIComponent, IllustratedMessage, IllustratedMessageType, Messaging, Message, MessageType, MessageBox, Dialog, Button, Text) => {
    "use strict";

    return BaseController.extend("aaic.cockpit.controller.Taskflows", {
        
        _selectedTaskflows: [],

        onInit() {
        
            const ownerComponent = this.getOwnerComponent();

            const router = ownerComponent.getRouter();

            router.getRoute("RouteTaskflows").attachPatternMatched(this.onRouteMatched, this);
        
        },

        onRouteMatched: function (event) {
            
            const ownerComponent = this.getOwnerComponent();

            ownerComponent.setOnHoldNavigation();

            const sideNavigation = ownerComponent.getSideNavigation();

            if (sideNavigation) {
                sideNavigation.setSelectedKey("taskflows");
            }

            Messaging.removeAllMessages();
            
        },

        onAfterRendering: function (event) {

            const view = this.getView();

            this.setMessagePopover(view);

            const table = view.byId("_IDTaskflowsTable");

            const illustratedMessage = new IllustratedMessage();

            illustratedMessage.setIllustrationType(IllustratedMessageType.NoData);
            illustratedMessage.setIllustrationSize(sap.m.IllustratedMessageSize.Medium);

            table.setNoData(illustratedMessage);

        },

        onSearch: function (event) {

            const view = this.getView();

            const taskName = view.byId("_IDTaskflowsTaskNameFilter").getValue();
            const taskId = view.byId("_IDTaskflowsTaskIdFilter").getValue();

            this._loadData(taskName, taskId);

        },

        onItemPress: function (event) {

            const id = event.getSource().getBindingContext("taskflows").getProperty("id");

            const router = UIComponent.getRouterFor(this);

            router.navTo("RouteTaskflow", { id: id });

        },

        onAdd: function (event) {
            
            this._openDialog();   

        },

        onCloseDialog: function(event) {            
            
            this._addTaskflowDialog.close();
        
        },

        onAddTaskflow: async function (event) {

            const view = this.getView();

            const resourceBundle = view.getModel("i18n").getResourceBundle();

            this._addTaskflowDialog.setBusy(true);

            const taskflow = {
                name: view.byId("_IDAddTaskflowInputName").getValue(),
                description: view.byId("_IDAddTaskflowInputDescription").getValue()
            };

            if ( taskflow.name === "" || taskflow.description === "") {
                this._addTaskflowDialog.setBusy(false);
                MessageBox.alert(resourceBundle.getText("taskNameAndDescriptionRequired"));
                return;
            }

            const formData = new FormData();
            
            const endpoint = this.getEndpoint('task_flow');

            try {

                // 1. Await the fetch call. This pauses execution until the response is received.
                const response = await fetch(endpoint, {
                    method: 'POST',
                    body: JSON.stringify(taskflow)
                });
                 
                if (!response.ok) {
                    // Throw an error to be caught by the catch block
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                // 2. Await the response.json() call to parse the body.
                const responseData = await response.json();

                // 3. Handle the successful data
                if (responseData.created) {
                
                    this.onSearch();
                
                    // Reset fields
                    view.byId("_IDAddTaskflowInputName").setValue("");
                    view.byId("_IDAddTaskflowInputDescription").setValue("");
                
                } else {
                    throw new Error(responseData.error || resourceBundle.getText("taskCreationFailed"));
                }

            } catch (error) {

                this._addTaskflowDialog.setBusy(false);

                const resourceBundle = view.getModel("i18n").getResourceBundle();

                // 4. Handle any errors during the fetch or parsing process
                MessageBox.error(error.message);

                const message = new Message({
                    message: resourceBundle.getText("communicationError"),
                    description: error.message,
                    type: MessageType.Error
                });
                
                Messaging.addMessages(message);

            }

            this._addTaskflowDialog.setBusy(false);

            this._addTaskflowDialog.close();

        },

        onDelete: function (event) {

            const view = this.getView();

            const table = view.byId("_IDTaskflowsTable");

            if (!table) {
                return;
            }

            this._selectedTaskflows = [];

            const selectedItems = table.getSelectedItems();

            const resourceBundle = view.getModel("i18n").getResourceBundle();

            if (selectedItems.length > 0) {

                selectedItems.forEach(element => {
                    this._selectedTaskflows.push({ 
                        id: element.getBindingContext("taskflows").getProperty("id")
                    });
                });
                
                if (!this._confirmDialog) {
                    
                    this._confirmDialog = new Dialog({
                        id: "_IDTaskflowsConfirmDialogDelete",
                        type: "Message",
                        title: resourceBundle.getText("confirm"),
                        content: new Text({ text: resourceBundle.getText("confirmDeleteTaskflows") }),
                        beginButton: new Button({
                            type: "Emphasized",
                            text: resourceBundle.getText("yes"),
                            press: function () {              
                                this._confirmDialog.setBusy(true);              
                                this._deleteTasks(this._selectedTaskflows, view);
                                this._confirmDialog.setBusy(false);
                                this._confirmDialog.close();
                                if (table) {
                                    table.removeSelections();
                                }
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

        //################ Private APIs ###################

        _openDialog: async function () {

			// Create dialog lazily
			this._addTaskflowDialog ??= await this.loadFragment({
				name: "aaic.cockpit.fragment.AddTaskflow",
                controller: this
			});

			this._addTaskflowDialog.open();
		},

        _loadData: async function(taskName, taskId) {

            const view = this.getView();

            view.setBusy(true);
         
            const model = view.getModel("taskflows");

            model.setData({taskflows: []});
            
            let endpoint = this.getEndpoint('task_flow');

            if (taskName !== "") {
                endpoint = endpoint + "&name=" + encodeURIComponent(taskName)
            }

            if (taskId !== "") {
                endpoint = endpoint + "&id=" + encodeURIComponent(taskId)
            }

            try {

                const responseData = await this.fetchData(endpoint);
                          
                model.setModelData(responseData);

                view.setBusy(false);

            } catch (error) {

                view.setBusy(false);

                MessageBox.error(error.message);

                const resourceBundle = view.getModel("i18n").getResourceBundle();

                const message = new Message({
                    message: resourceBundle.getText("communicationError"),
                    description: error.message,
                    type: MessageType.Error
                });
                
                Messaging.addMessages(message);

            }

        },

        _deleteTasks: async function(selectedTaskflows, view) {

            view.setBusy(true);
         
            const model = view.getModel("taskflows");
            
            const modelData = model.getData();

            for (const selectedTaskflow of selectedTaskflows) {
                
                const endpoint = this.getEndpoint('task_flow') + '&id=' + selectedTaskflow.id;

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
                        //console.log('Tool deleted successfully!', responseData);
                    } else {
                        throw new Error(`Delete failed! error: ${responseData.error}`);
                    }
                                         
                } catch (error) {

                    view.setBusy(false);

                    const resourceBundle = view.getModel("i18n").getResourceBundle();

                    // 4. Handle any errors during the fetch or parsing process
                    MessageBox.error(error.message);

                    const message = new Message({
                        message: resourceBundle.getText("communicationError"),
                        description: error.message,
                        type: MessageType.Error
                    });
                    
                    Messaging.addMessages(message);
                    
                    // Exit the for...in
                    break;
                }

                // Remove deleted task from the local JSON Model
                const taskflows = modelData.taskflows.filter((taskflow) => taskflow.id !== selectedTaskflow.id );

                modelData.taskflows = taskflows;

            };

            model.setModelData(modelData);

            const table = view.byId("_IDTasksTable");

            if (table) {
                table.removeSelections();
            }

            view.setBusy(false);
        
        }
       
    });
});
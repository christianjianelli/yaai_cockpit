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

    return BaseController.extend("aaic.cockpit.controller.Tasks", {
        
        onInit() {
        
            const ownerComponent = this.getOwnerComponent();

            const router = ownerComponent.getRouter();

            router.getRoute("RouteTasks").attachPatternMatched(this.onRouteMatched, this);
        
        },

        onRouteMatched: function (event) {
            
            const ownerComponent = this.getOwnerComponent();

            ownerComponent.setOnHoldNavigation();

            const sideNavigation = ownerComponent.getSideNavigation();

            if (sideNavigation) {
                sideNavigation.setSelectedKey("tasks");
            }

            Messaging.removeAllMessages();
            
        },

        onAfterRendering: function (event) {

            const view = this.getView();

            this.setMessagePopover(view);

            const table = view.byId("_IDTasksTable");

            const illustratedMessage = new IllustratedMessage();

            illustratedMessage.setIllustrationType(IllustratedMessageType.NoData);
            illustratedMessage.setIllustrationSize(sap.m.IllustratedMessageSize.Medium);

            table.setNoData(illustratedMessage);

        },

        onSearch: function (event) {

            const view = this.getView();

            const taskName = view.byId("_IDTasksTaskNameFilter").getValue();
            const taskId = view.byId("_IDTasksTaskIdFilter").getValue();

            this._loadData(taskName, taskId);
          
        },

        onItemPress: function (event) {

            const id = event.getSource().getBindingContext("tasks").getProperty("id");

            const router = UIComponent.getRouterFor(this);

            router.navTo("RouteTask", { id: id });

        },

        onAdd: function (event) {
            
            this._openDialog();   

        },

        onCloseDialog: function(event) {            
            
            this._addTaskDialog.close();
        
        },

        onAddTask: async function (event) {

            const view = this.getView();

            const resourceBundle = view.getModel("i18n").getResourceBundle();

            this._addTaskDialog.setBusy(true);

            const task = {
                name: view.byId("_IDAddTaskInputName").getValue(),
                description: view.byId("_IDAddTaskInputDescription").getValue()
            };

            if ( task.name === "" || task.description === "") {
                this._addTaskDialog.setBusy(false);
                MessageBox.alert(resourceBundle.getText("taskNameAndDescriptionRequired"));
                return;
            }

            const formData = new FormData();
            
            // Fill form data
            Object.keys(task).forEach(key => {
                formData.append(key, task[key]);
            });
            
            const endpoint = this.getEndpoint('task');

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
                if (responseData.created) {
                
                    this.onSearch();
                
                    // Reset fields
                    view.byId("_IDAddTaskInputName").setValue("");
                    view.byId("_IDAddTaskInputDescription").setValue("");
                
                } else {
                    throw new Error(responseData.error || resourceBundle.getText("taskCreationFailed"));
                }

            } catch (error) {

                this._addTaskDialog.setBusy(false);

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

            this._addTaskDialog.setBusy(false);

            this._addTaskDialog.close();

        },

        onDelete: function (event) {

            const view = this.getView();

            const table = view.byId("_IDTasksTable");

            if (!table) {
                return;
            }

            const selectedItems = table.getSelectedItems();

            const resourceBundle = view.getModel("i18n").getResourceBundle();

            const selectedTasks = [];

            if (selectedItems.length > 0) {

                selectedItems.forEach(element => {
                    selectedTasks.push({ 
                        id: element.getBindingContext("tasks").getProperty("id")
                    });
                });
                
                if (!this._confirmDialog) {
                    
                    this._confirmDialog = new Dialog({
                        id: "_IDTasksConfirmDialogDelete",
                        type: "Message",
                        title: resourceBundle.getText("confirm"),
                        content: new Text({ text: resourceBundle.getText("confirmDeleteTasks") }),
                        beginButton: new Button({
                            type: "Emphasized",
                            text: resourceBundle.getText("yes"),
                            press: function () {              
                                this._confirmDialog.setBusy(true);              
                                this._deleteTasks(selectedTasks, view);
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
			this._addTaskDialog ??= await this.loadFragment({
				name: "aaic.cockpit.fragment.AddTask",
                controller: this
			});

			this._addTaskDialog.open();
		},

        _loadData: async function(taskName, taskId) {

            const view = this.getView();

            view.setBusy(true);
         
            const model = view.getModel("tasks");

            model.setData({tasks: []});
            
            let endpoint = this.getEndpoint('task');

            if (taskName !== "") {
                endpoint = endpoint + "&name=" + encodeURIComponent(taskName)
            }

            if (taskId !== "") {
                endpoint = endpoint + "&id=" + encodeURIComponent(taskId)
            }

            try {
          
                const responseData = await this.fetchData(endpoint);
                
                model.setData(responseData);

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

        _deleteTasks: async function(selectedTasks, view) {

            view.setBusy(true);
         
            const model = view.getModel("tasks");
            
            const modelData = model.getData();

            for (const selectedTask of selectedTasks) {
                
                const endpoint = this.getEndpoint('task') + '&id=' + selectedTask.id;

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
                const tasks = modelData.tasks.filter((task) => task.id !== selectedTask.id );

                modelData.tasks = tasks;

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
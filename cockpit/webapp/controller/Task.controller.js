sap.ui.define([
    "aaic/cockpit/controller/BaseController",
    "sap/ui/core/Messaging",
    "sap/ui/core/message/Message",
	"sap/ui/core/message/MessageType",
    "sap/m/MessageToast"
], (BaseController, Messaging, Message, MessageType, MessageToast) => {
    "use strict";

    return BaseController.extend("aaic.cockpit.controller.Task", {

        _hasChanges: false,

        _edit: false,

        onInit() {

            const ownerComponent = this.getOwnerComponent();

            const router = ownerComponent.getRouter();

            router.getRoute("RouteTask").attachPatternMatched(this.onRouteMatched, this);

        },

        onRouteMatched: function (event) {

            let args = event.getParameter("arguments");

            let view = this.getView();

            let model = view.getModel("tasks");

            let modelData = model.getData();

            if(modelData.tasks) {

                let index = modelData.tasks.findIndex(
                    task => task.id === args.id
                );
                
                view.bindElement({
                    path: `/tasks/${index}`,
                    model: "tasks"
                });

            }

            this._id= args.id;

            this._edit = false;
            
            this._setEditMode(this._edit);

            const ownerComponent = this.getOwnerComponent();

            ownerComponent.setOnHoldNavigation();

            const sideNavigation = ownerComponent.getSideNavigation();

            if (sideNavigation) {
                sideNavigation.setSelectedKey("tasks");
            }
            
            Messaging.removeAllMessages();

            this._loadData();            

        },

        onAfterRendering: function (event) {

            const view = this.getView();

            this.setMessagePopover(view);

        },

        onToogleEdit: function(event) {
            
            this._edit = !this._edit;
            
            this._setEditMode(this._edit);

        },

        onSave: async function (event) {

            const view = this.getView();
            
            const resourceBundle = view.getModel("i18n").getResourceBundle();

            const button = view.byId("_IDTaskMessagePopoverButton");

            Messaging.removeAllMessages();

            const task = {
                id: this.getView().getBindingContext("tasks").getProperty("id"),
                name: this.getView().getBindingContext("tasks").getProperty("name"),
                description: this.getView().getBindingContext("tasks").getProperty("description")
            };

            if ( task.name === "" || task.description === "") {

                const message = new Message({
                    message: resourceBundle.getText("fillAllRequiredFields"),
                    description: resourceBundle.getText("taskRequiredFieldsDescription"),
                    type: MessageType.Error
                });
                
                Messaging.addMessages(message);

                this._fireMessagePopoverButtonPress(button);

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

                    MessageToast.show(resourceBundle.getText("TaskUpdatedSuccessfully"));

                    const model = view.getModel("tasks");

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

                const message = new Message({
                    message: resourceBundle.getText("updateError"),
                    description: error.message,
                    type: MessageType.Error
                });
            
                Messaging.addMessages(message);

                this._fireMessagePopoverButtonPress(button);
                
            }

        },

        //################ Private APIs ###################

        _loadData: async function() {

            const view = this.getView();

            view.setBusy(true);
         
            const endpoint = this.getEndpoint('task');
            
            const responseData = await this.fetchData(endpoint + "&id=" + this._id);

            if (!Array.isArray(responseData.tasks)) {
                view.setBusy(false); 
                return;
            }

            let model = view.getModel("tasks");

            let modelData = model.getData();

            let index = 0;
            
            if (!modelData.tasks) {
            
                modelData.tasks = [];
            
                modelData.tasks.push({
                    id: responseData.tasks[0].id,
                    name: responseData.tasks[0].name,
                    description: responseData.tasks[0].description
                });
            
            } else {
                
                index = modelData.tasks.findIndex( task => task.id === this._id );
                
                if(!modelData.tasks[index]) {
                   
                    modelData.tasks.push({
                        id: responseData.tasks[0].id,
                        name: responseData.tasks[0].name,
                        description: responseData.tasks[0].description
                    });
                
                } else {
                    
                    modelData.tasks[index].id = responseData.tasks[0].id;
                    modelData.tasks[index].name = responseData.tasks[0].name;
                    modelData.tasks[index].description = responseData.tasks[0].description;

                }

                model.setModelData(modelData);
            }

            view.bindElement({
                path: `/tasks/${index}`,
                model: "tasks"
            });

            view.setBusy(false);

        },

        _fireMessagePopoverButtonPress: function(button) {
            
            if (button.isFocusable()) {
                button.firePress();
            } else {   
                setTimeout(()=>{ 
                    if (button.isFocusable()) {
                        button.firePress();
                    }
                }, 1000);
            }

        },

        _setEditMode: function(editable) {
            
            const view = this.getView();

            const idsEditable = ["_IDTaskNameInput", "_IDTaskDescriptionInput"];

            const idsEnable = ["_IDTaskButtonSave"];                

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
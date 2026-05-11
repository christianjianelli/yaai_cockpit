sap.ui.define([
    "aaic/cockpit/controller/BaseController",
    "sap/ui/core/Messaging",
    "sap/ui/core/message/Message",
	"sap/ui/core/message/MessageType",
    "sap/m/MessageToast",
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Text"
], (BaseController, Messaging, Message, MessageType, MessageToast, Dialog, Button, Text) => {
    "use strict";

    return BaseController.extend("aaic.cockpit.controller.Taskflow", {

        _hasChanges: false,

        _edit: false,

        onInit() {

            const ownerComponent = this.getOwnerComponent();

            const router = ownerComponent.getRouter();

            router.getRoute("RouteTaskflow").attachPatternMatched(this.onRouteMatched, this);

        },

        onRouteMatched: function (event) {

            let args = event.getParameter("arguments");

            let view = this.getView();

            let model = view.getModel("taskflows");

            let modelData = model.getData();

            if(modelData.taskflows) {

                let index = modelData.taskflows.findIndex(
                    taskflow => taskflow.id === args.id
                );
                
                view.bindElement({
                    path: `/taskflows/${index}`,
                    model: "taskflows"
                });

            }

            this._id= args.id;

            this._edit = false;
            
            this._setEditMode(this._edit);

            const ownerComponent = this.getOwnerComponent();

            ownerComponent.setOnHoldNavigation();

            const sideNavigation = ownerComponent.getSideNavigation();

            if (sideNavigation) {
                sideNavigation.setSelectedKey("taskflows");
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

            const button = view.byId("_IDTaskflowMessagePopoverButton");

            Messaging.removeAllMessages();

            const taskflow = {
                id: this.getView().getBindingContext("taskflows").getProperty("id"),
                name: this.getView().getBindingContext("taskflows").getProperty("name"),
                description: this.getView().getBindingContext("taskflows").getProperty("description"),
                tasks: this.getView().getBindingContext("taskflows").getProperty("tasks")
            };

            if ( taskflow.name === "" || taskflow.description === "") {

                const message = new Message({
                    message: resourceBundle.getText("fillAllRequiredFields"),
                    description: resourceBundle.getText("taskRequiredFieldsDescription"),
                    type: MessageType.Error
                });
                
                Messaging.addMessages(message);

                this._fireMessagePopoverButtonPress(button);

                return;
            }
                        
            const endpoint = this.getEndpoint('task_flow');

            try {

                // 1. Await the fetch call. This pauses execution until the response is received.
                const response = await fetch(endpoint, {
                    method: 'PUT',
                    body: JSON.stringify(taskflow)
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

                    const model = view.getModel("taskflows");

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

        onCloseDialog: function(event) {            
            
            this._addTaskDialog.close();
        
        },

        onTaskValueHelpRequest: async function(event) {

            this._valueHelpSourceId = event.getSource().getId();

			// Create dialog lazily
			this.TaskVHDialog ??= await this.loadFragment({
				name: "aaic.cockpit.fragment.TaskValueHelp",
                controller: this
			});

			this.TaskVHDialog.open();

            this.TaskVHDialog.setBusy(true);
            
            try {
                
                await this._loadTasksData(this.getView());

                this.TaskVHDialog.setBusy(false);

            } catch (error) {

                this.TaskVHDialog.setBusy(false);

                const message = new Message({
                    message: error.message,
                    type: MessageType.Error
                });
                
                Messaging.addMessages(message);

            }

		},

        onTaskValueHelpDialogClose: function (event) {

            const selectedItem = event.getParameter("selectedItem");

            console.log(this._valueHelpSourceId); 

			if (!selectedItem) {
				return;
			}

            const taskId = selectedItem.getBindingContext("tasks").getProperty("id");
                
            const taskName = selectedItem.getBindingContext("tasks").getProperty("name");

            const view = this.getView();

            const table = view.byId("_IDTaskflowTasksTable");

            if (!table) {
                return;
            }

            const selectedItems = table.getSelectedItems();

            const model = view.getModel("taskflows");

            const modelData = model.getData();

            const index = modelData.taskflows.findIndex( taskflow => taskflow.id === this._id );

            if(this._valueHelpSourceId.match(/assignprevioustask/i)){

                selectedItems.forEach(selectedItem => {
                    
                    const taskIndex = modelData.taskflows[index].tasks.findIndex( 
                        task => ( task.taskId === selectedItem.getBindingContext("taskflows").getProperty("taskId") &&
                                  task.previousTaskId === selectedItem.getBindingContext("taskflows").getProperty("previousTaskId") )   
                    );

                    if(taskIndex !== -1) {
                        
                        modelData.taskflows[index].tasks[taskIndex].previousTaskId = taskId;
                        modelData.taskflows[index].tasks[taskIndex].previousTaskName = taskName;

                        model.updateModelData(modelData);

                    }

                });

            } else {
            
                modelData.taskflows[index].tasks.push({
                    taskId: taskId,
                    taskName: taskName
                });

                model.updateModelData(modelData);

            }
            
		},

        onDelete: function (event) {

            const view = this.getView();

            const table = view.byId("_IDTaskflowTasksTable");

            if (!table) {
                return;
            }

            this._selectedTasks = [];

            const selectedItems = table.getSelectedItems();

            const resourceBundle = view.getModel("i18n").getResourceBundle();

            if (selectedItems.length > 0) {

                selectedItems.forEach(element => {
                    this._selectedTasks.push({ 
                        taskId: element.getBindingContext("taskflows").getProperty("taskId"),
                        previousTaskId: element.getBindingContext("taskflows").getProperty("previousTaskId")
                    });
                });
                
                if (!this._confirmDialog) {
                    
                    this._confirmDialog = new Dialog({
                        id: "_IDTaskflowConfirmDialogDelete",
                        type: "Message",
                        title: resourceBundle.getText("confirm"),
                        content: new Text({ text: resourceBundle.getText("confirmDeleteTaskflows") }),
                        beginButton: new Button({
                            type: "Emphasized",
                            text: resourceBundle.getText("yes"),
                            press: function () {              
                                this._confirmDialog.setBusy(true);              
                                this._deleteTasks(this._selectedTasks, view);
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

        onAfterRenderingHTMLControlFC: async function (event) {

            const container = document.getElementById('aaic-flowchart-diagram-container');
            
            let pre = document.getElementById('aaic-flowchart-diagram-source-code');

            if (!pre) {
                pre = document.createElement('pre');
                pre.id = 'aaic-flowchart-diagram-source-code';
                pre.className = 'mermaid';
                pre.style = 'display:none';
                pre.textContent = mermaid;
                container.appendChild(pre);
            } else {
                pre.textContent = mermaid;
            }

            let div = document.getElementById('aaic-flowchart-diagram-output');

            if (!div) {
                div = document.createElement('div');
                div.id = 'aaic-flowchart-diagram-output';
                div.style = 'width:100%; text-align:center';
                container.appendChild(div);
            }

            const view = this.getView();

            const model = view.getModel("taskflows");

            const modelData = model.getData();

            const index = modelData.taskflows.findIndex( taskflow => taskflow.id === this._id );

            let mermaidFlowchartDiagram = this._generateMermaidFlowchart(modelData.taskflows[index].tasks);

            // Render accepts an ID for the temporary SVG and the code
            const { svg } = await mermaid.render('mermaidFlowchartDiagram', mermaidFlowchartDiagram);
            
            // Insert the SVG into the output div
            div.innerHTML = svg;

        },

        onGetFlowchartDiagramScreenShot: async function() {
          
            const element = document.getElementById('aaic-flowchart-diagram-container');
            
            if (element) {

                const view = this.getView();
                
                view.setBusy(true);

                await html2canvas(element).then(canvas => {
                    const link = document.createElement('a');
                    link.href = canvas.toDataURL();
                    link.download = this._id + '_fc.png';
                    link.click();
                });

                view.setBusy(false);

            } else {
                console.error('flowchart element not found.');
            }

        },

        //################ Private APIs ###################

        _loadData: async function() {

            const view = this.getView();

            view.setBusy(true);
         
            const endpoint = this.getEndpoint('task_flow');
            
            const responseData = await this.fetchData(endpoint + "&id=" + this._id);

            if (!Array.isArray(responseData.taskflows)) {
                view.setBusy(false); 
                return;
            }

            let model = view.getModel("taskflows");

            let modelData = model.getData();

            let index = 0;
            
            if (!modelData.taskflows) {
            
                modelData.taskflows = [];
            
                modelData.taskflows.push({
                    id: responseData.taskflows[0].id,
                    name: responseData.taskflows[0].name,
                    description: responseData.taskflows[0].description,
                    tasks: responseData.taskflows[0].tasks
                });
            
            } else {
                
                index = modelData.taskflows.findIndex( taskflow => taskflow.id === this._id );
                
                if(!modelData.taskflows[index]) {
                   
                    modelData.taskflows.push({
                        id: responseData.taskflows[0].id,
                        name: responseData.taskflows[0].name,
                        description: responseData.taskflows[0].description,
                        tasks: responseData.taskflows[0].tasks
                    });
                
                } else {
                    
                    modelData.taskflows[index].id = responseData.taskflows[0].id;
                    modelData.taskflows[index].name = responseData.taskflows[0].name;
                    modelData.taskflows[index].description = responseData.taskflows[0].description;
                    modelData.taskflows[index].tasks = responseData.taskflows[0].tasks;
                }

                model.setModelData(modelData);
            }

            view.bindElement({
                path: `/taskflows/${index}`,
                model: "taskflows"
            });

            view.setBusy(false);

        },

        _openDialog: async function () {

			// Create dialog lazily
			this._addTaskDialog ??= await this.loadFragment({
				name: "aaic.cockpit.fragment.AddTaskToFlow",
                controller: this
			});

			this._addTaskDialog.open();
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

            const idsEditable = ["_IDTaskflowNameInput", "_IDTaskflowDescriptionInput"];

            const idsEnable = ["_IDTaskflowButtonSave", "_IDTaskflowButtonAssignPreviousTask", "_IDTaskflowButtonAddTask", "_IDTaskflowButtonDeleteTask"];                

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

        },

        _loadTasksData: async function() {

            const view = this.getView();

            view.setBusy(true);
         
            const model = view.getModel("tasks");

            model.setData({tasks: []});
            
            const endpoint = this.getEndpoint('task');

            try {
          
                const responseData = await this.fetchData(endpoint);
                
                model.setData(responseData);

                view.setBusy(false);

            } catch (error) {

                view.setBusy(false);

            }
        },

        _deleteTasks: async function(selectedTasks, view) {

            const model = view.getModel("taskflows");

            const modelData = model.getData();

            const index = modelData.taskflows.findIndex( taskflow => taskflow.id === this._id );

            for (const selectedTask of selectedTasks) {

                // Remove deleted tasks from the local JSON Model
                modelData.taskflows[index].tasks = modelData.taskflows[index].tasks.filter(
                    (task) => ( task.taskId !== selectedTask.taskId || task.previousTaskId !== selectedTask.previousTaskId ) 
                );

                model.updateModelData(modelData);

            }

        },

        _generateMermaidFlowchart: function (tasks) {
            // Mermaid header
            const lines = ["flowchart TD"];

            // Store unique nodes
            const nodes = new Map();

            // Store unique connections
            const connections = new Set();

            // Helper to sanitize IDs for Mermaid
            const sanitizeId = (id) => {
                return "T_" + id.replace(/[^a-zA-Z0-9]/g, "");
            };

            tasks.forEach(task => {
                const currentId = sanitizeId(task.taskId);
                const currentLabel = task.taskName;

                // Add current node
                if (!nodes.has(currentId)) {
                    nodes.set(currentId, `${currentId}["${currentLabel}"]`);
                }

                // Add previous node if exists
                if (task.previousTaskId) {
                    const previousId = sanitizeId(task.previousTaskId);
                    const previousLabel = task.previousTaskName;

                    if (!nodes.has(previousId)) {
                        nodes.set(previousId, `${previousId}["${previousLabel}"]`);
                    }

                    // Add connection
                    connections.add(`${previousId} --> ${currentId}`);
                }
            });

            // Add all nodes
            lines.push(...nodes.values());

            // Add all connections
            lines.push(...connections);

            return lines.join("\n");
        }

    });
});
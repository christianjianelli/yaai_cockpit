sap.ui.define([
    "aaic/cockpit/controller/BaseController",
    "sap/ui/core/Messaging",
    "sap/ui/core/message/Message",
	"sap/ui/core/message/MessageType",
    "sap/m/MessageToast"
], (BaseController, Messaging, Message, MessageType, MessageToast) => {
    "use strict";

    return BaseController.extend("aaic.cockpit.controller.Tool", {

        _hasChanges: false,

        _edit: false,

        onInit() {

            const ownerComponent = this.getOwnerComponent();

            const router = ownerComponent.getRouter();

            router.getRoute("RouteTool").attachPatternMatched(this.onRouteMatched, this);

        },

        onRouteMatched: function (event) {

            let args = event.getParameter("arguments");

            let view = this.getView();

            let model = view.getModel("tools");

            let modelData = model.getData();

            if(modelData.tools) {

                let index = modelData.tools.findIndex(
                    tool => tool.className.toUpperCase() === args.className.toUpperCase() &&
                        tool.methodName.toUpperCase() === args.methodName.toUpperCase()
                );
                
                view.bindElement({
                    path: `/tools/${index}`,
                    model: "tools"
                });

            }

            this._className= args.className;
            this._methodName= args.methodName;

            this._edit = false;
            
            this._setEditMode(this._edit);

            const ownerComponent = this.getOwnerComponent();

            ownerComponent.setOnHoldNavigation();

            const sideNavigation = ownerComponent.getSideNavigation();

            if (sideNavigation) {
                sideNavigation.setSelectedKey("tools");
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

            const button = view.byId("_IDToolMessagePopoverButton");

            Messaging.removeAllMessages();

            const tool = {
                class_name: this.getView().getBindingContext("tools").getProperty("className"),
                method_name: this.getView().getBindingContext("tools").getProperty("methodName"),
                proxy_class: this.getView().getBindingContext("tools").getProperty("proxyClass"),
                description: this.getView().getBindingContext("tools").getProperty("description")
            };

            if ( tool.class_name === "" || tool.method_name === "" || tool.description === "") {

                const message = new Message({
                    message: resourceBundle.getText("fillAllRequiredFields"),
                    description: resourceBundle.getText("toolRequiredFieldsDescription"),
                    type: MessageType.Error
                });
                
                Messaging.addMessages(message);

                this._fireMessagePopoverButtonPress(button);

                return;
            }

            const formData = new FormData();
            
            // Fill form data
            Object.keys(tool).forEach(key => {
                formData.append(key, tool[key]);
            });
            
            const endpoint = this.getEndpoint('llm_tool');

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

                    MessageToast.show(resourceBundle.getText("toolUpdatedSuccessfully"));

                    const model = view.getModel("tools");

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

        //################ Private APIs ###################

        _loadData: async function() {

            const view = this.getView();

            view.setBusy(true);
         
            const endpoint = this.getEndpoint('llm_tool');
          
            const responseData = await this.fetchData(endpoint + "&class_name=" + this._className + "&method_name=" + this._methodName);

            let model = view.getModel("tools");

            let modelData = model.getData();

            let index = 0;

            if (!modelData.tools) {
            
                modelData.tools = [];
            
                modelData.tools.push({
                    className: responseData.tool.className,
                    methodName: responseData.tool.methodName,
                    proxyClass: responseData.tool.proxyClass,
                    description: responseData.tool.description
                });
            
            } else {
                
                index = modelData.tools.findIndex( tool => tool.className === this._className && tool.methodName === this._methodName );
                
                if(!modelData.tools[index]) {
                   
                    modelData.tools.push({
                        className: responseData.tool.className,
                        methodName: responseData.tool.methodName,
                        proxyClass: responseData.tool.proxyClass,
                        description: responseData.tool.description
                    });
                
                } else {
                    
                    modelData.tools[index].className = responseData.tool.className;
                    modelData.tools[index].methodName = responseData.tool.methodName;
                    modelData.tools[index].proxyClass = responseData.tool.proxyClass;
                    modelData.tools[index].description = responseData.tool.description;
                }

                model.setModelData(modelData);
            }

            view.bindElement({
                path: `/tools/${index}`,
                model: "tools"
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

            const idsEditable = ["_IDToolProxyClassInput", "_IDToolToolDescriptionInput"];

            const idsEnable = ["_IDToolButtonSave"];                

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
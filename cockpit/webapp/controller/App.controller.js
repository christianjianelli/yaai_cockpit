sap.ui.define(
  [
    "aaic/cockpit/controller/BaseController",
    "aaic/cockpit/controller/Chat",
    "sap/ui/core/UIComponent",
    "sap/ui/core/Messaging",
    "sap/ui/core/message/Message",
	  "sap/ui/core/message/MessageType",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment"
  ], (BaseController, Chat, UIComponent, Messaging, Message, MessageType, MessageBox, Fragment) => {
    "use strict";

    return BaseController.extend("aaic.cockpit.controller.App", {

      _remainingTextTemplate: "",

      onInit() {

        const view = this.getView();

        const sidePanel = view.byId("_IDAppSidePanel");

        const selectApiControl = view.byId("_IDAppSelectApi");

        const sideNavigation = view.byId("_IDAppSideNavigation");

        const ownerComponent = this.getOwnerComponent();

        const resourceBundle = ownerComponent.getModel("i18n").getResourceBundle();

        if (sideNavigation) {
          ownerComponent.setSideNavigation(sideNavigation);
        }
        
        if (selectApiControl) {
          Chat.setSelectApiControl(selectApiControl);
        }

        Chat.setSidePanel(sidePanel);

        Chat.setResourceBundle(resourceBundle);

        const model = ownerComponent.getModel("settings");

        const modelData = model.getData();

        if (modelData.DefaultAPI) {
          Chat.api = modelData.DefaultAPI;
        }

        if (modelData.DefaultAgentId) {
          Chat.agentId = modelData.DefaultAgentId;
        }

        this._loadUserInfo();

      },

      onBeforeRendering() {

        this._loadNavigation();

        this._loadApis();
        
      },

      onAfterRenderingHTMLControl: function (event) {

        Chat.addWelcomeMessage();

        const view = this.getView();

        const resourceBundle = view.getModel("i18n").getResourceBundle();

        this._remainingTextTemplate = resourceBundle.getText("remainingTextTemplate");

        const selectApi = view.byId("_IDAppSelectApi");

        if (selectApi) {
          selectApi.setSelectedKey(Chat.api);
        }

        const textApiKey = view.byId("_IDAppTextApiKey");

        if (textApiKey) {
          textApiKey.setValue(Chat.apiKey);
        }

        const textAgentId = view.byId("_IDAppTextAgentId");

        if (textAgentId) {
          textAgentId.setValue(Chat.agentId);
        }

      },

      onSidePanelToggle: function (event) {

        this._loadApis();

        Chat.resumeChat();

      },

      onSideNavButtonPress: function () {

        const toolPage = this.byId("_IDAppToolPage");

        const sideExpanded = toolPage.getSideExpanded();

        toolPage.setSideExpanded(!sideExpanded);

      },

      onItemSelect: function (event) {

        const router = UIComponent.getRouterFor(this);

        const ownerComponent = this.getOwnerComponent();

        switch (event.getSource().getSelectedKey()) {

          case "home":
            ownerComponent.setOnHoldNavigation("RouteMain");
            break;

          case "apis":
            ownerComponent.setOnHoldNavigation();
            break;

          case "openai-api":
            ownerComponent.setOnHoldNavigation("RouteApi", { id: "OPENAI" });
            break;

          case "anthropic-api":
            ownerComponent.setOnHoldNavigation("RouteApi", { id: "ANTHROPIC" });
            break;

          case "google-api":
            ownerComponent.setOnHoldNavigation("RouteApi", { id: "GOOGLE" });
            break;

          case "mistral-api":
            ownerComponent.setOnHoldNavigation("RouteApi", { id: "MISTRAL" });
            break;

          case "ollama-api":
            ownerComponent.setOnHoldNavigation("RouteApi", { id: "OLLAMA" });
            break;  

          case "all-apis":
            ownerComponent.setOnHoldNavigation("RouteApis");
            break;

          case "agents":
            ownerComponent.setOnHoldNavigation("RouteAgents");
            break;

          case "tools":
            ownerComponent.setOnHoldNavigation("RouteTools");
            break;

          case "documents":
            ownerComponent.setOnHoldNavigation("RouteDocuments");
            break;

          case "chats":
            ownerComponent.setOnHoldNavigation("RouteChats");
            break;

          case "logs":
            ownerComponent.setOnHoldNavigation("RouteLogs");
            break;

          case "async-tasks":
            ownerComponent.setOnHoldNavigation("RouteAsyncTasks");
            break;

          case "documentation":
            window.open("https://github.com/christianjianelli/yaai_cloud_cockpit");  
            break;
            
          default:
            break;
        }
        
        const preventDataLoss = ownerComponent.preventDataLoss();

        if (preventDataLoss === true) {
          return;
        } else {

          const onHoldNavigation = ownerComponent.getOnHoldNavigation();

          if (onHoldNavigation.route === "") {
            return;
          } 

          router.navTo(onHoldNavigation.route, onHoldNavigation.params);

        }
      },

      onSend: async function (event) {

        const view = this.getView();

        const textArea = view.byId("_IDAppTextAreaUserPrompt");

        const userPrompt = textArea.getValue();

        if (userPrompt === "") {
          return;
        }

        const selectApi = view.byId("_IDAppSelectApi");

        const api = selectApi.getSelectedKey();

        if (api === "") {
          return;
        }

        const textApiKey = view.byId("_IDAppTextApiKey");

        const apiKey = textApiKey.getValue();

        const textAgentId = view.byId("_IDAppTextAgentId");

        const agentId = textAgentId.getValue();

        await new Promise(resolve => setTimeout(resolve, 300));

        const buttonsIds = ["_IDAppButtonRefresh", "_IDAppButtonSend", "_IDAppButtonClear", "_IDAppButtonNewChat"];

        for (const buttonId of buttonsIds) {
          const button = view.byId(buttonId);  
          button.setEnabled(false);
        }
        
        textArea.setValue("");

        textArea.fireLiveChange();

        // Send User Prompt
        await Chat.sendUserPromptAsync(userPrompt, api, apiKey, agentId);

        for (const buttonId of buttonsIds) {
          const button = view.byId(buttonId);  
          button.setEnabled(true);
        }
        
      },

      onRefresh: async function (event) {

        if (Chat.chatId === "") {
          return;
        }

        Chat.resumeChat();

      },

      onClear: function (event) {

        const view = this.getView();

        const textArea = view.byId("_IDAppTextAreaUserPrompt");

        textArea.setValue("");

        textArea.fireLiveChange();

      },

      onNewChat: function (event) {

        this.onClear(event);

        Chat.clear();

        const view = this.getView();

        const button = view.byId("_IDAppButtonSend");

        button.setEnabled(true);

      },

      onSelectApiChange: function (event) {

        const select = event.getSource();

        Chat.api = select.getSelectedKey();

      },

      onTextApiKeyChange: function (event) {

        const text = event.getSource();

        Chat.apiKey = text.getValue();

      },

      onTextAgentIdChange: function (event) {

        const text = event.getSource();

        Chat.agentId = text.getValue();

      },

      onUserPromptLiveChange: function (event) {

        const textArea = event.getSource();

        const maxLength = textArea.getMaxLength();

        const userPrompt = textArea.getValue();

        const view = this.getView();

        const remainingLength = maxLength - userPrompt.length;

        const remainingLengthText = view.byId("_IDAppTextUserPromptRemainingLength");

        //remainingLengthText.setText( remainingLength + ' of ' + maxLength + ' remaining' );

        remainingLengthText.setText(this._remainingTextTemplate.replace("&1", remainingLength.toString()).replace("&2", maxLength.toString()));

      },

      onDisplayUserInfo: async function (event) {
        
        // Create popover lazily
        this.UserInfoPopover ??= await this.loadFragment({
          name: "aaic.cockpit.fragment.UserInfo",
          controller: this
        });

			  this.UserInfoPopover.openBy(event.getSource());

      },

      onCloseUserInfo: function(event) {
        this.UserInfoPopover.close();
			},

      onDisplayUserSettings: async function (event) {

        this._loadApis();
        
        // Create popover lazily
        this.UserSettingsDialog ??= await this.loadFragment({
          name: "aaic.cockpit.fragment.UserSettings",
          controller: this
        });

			  this.UserSettingsDialog.openBy(event.getSource());

      },

      onSaveUserSettings: function(event) {

        const view = this.getView();

        const model = view.getModel("settings");

        // Convert to string before storing
        localStorage.setItem('userSettings', JSON.stringify(model.getData()));

        this.UserSettingsDialog.close();
			},

      onCloseUserSettings: function(event) {
        this.UserSettingsDialog.close();
			},

      //################ Private APIs ###################

      _loadNavigation: async function () {

        const view = this.getView();

        const resourceBundle = view.getModel("i18n").getResourceBundle();

        const navigationModel = view.getModel("navigation");

        const navigationData = {
          "navigation": [
            {
              "title": resourceBundle.getText("home"),
              "icon": "sap-icon://home",
              "key": "home"
            },
            {
              "title": resourceBundle.getText("LLM_APIs"),
              "icon": "sap-icon://ai",
              "expanded": true,
              "key": "apis",
              "items": [
                {
                  "title": "OpenAI",
                  "key": "openai-api"
                },
                {
                  "title": "Anthropic",
                  "key": "anthropic-api"
                },
                {
                  "title": "Google Gemini",
                  "key": "google-api"
                },
                {
                  "title": "Mistral",
                  "key": "mistral-api"
                },{
                  "title": "Ollama",
                  "key": "ollama-api"
                },
                {
                  "title": resourceBundle.getText("allAPIs"),
                  "key": "all-apis"
                }
              ]
            },
            {
              "title": resourceBundle.getText("tools"),
              "icon": "sap-icon://syntax",
              "key": "tools"
            },
            {
              "title": resourceBundle.getText("ragDocuments"),
              "icon": "sap-icon://documents",
              "key": "documents"
            },
            {
              "title": resourceBundle.getText("agents"),
              "icon": "sap-icon://enablement",
              "key": "agents"
            },
            {
              "title": resourceBundle.getText("chats"),
              "icon": "sap-icon://discussion",
              "key": "chats"
            },
            {
              "title": resourceBundle.getText("logs"),
              "icon": "sap-icon://command-line-interfaces",
              "key": "logs"
            },
            {
              "title": resourceBundle.getText("asyncTasks"),
              "icon": "sap-icon://future",
              "key": "async-tasks"
            }				
          ],
          "fixedNavigation": [
            {
              "title": resourceBundle.getText("documentation"),
              "icon": "sap-icon://learning-assistant",
              "key": "documentation"
            }
          ],
          "selectedKey": "home"
        };

        navigationModel.setData(navigationData);

      },

      _loadApis: async function () {

        const view = this.getView();

        const sidePanel = view.byId("_IDAppVBoxChat");

        if (sidePanel) {
          sidePanel.setBusy(true);
        }

        let model = view.getModel("apis");

        try {

          const endpoint = this.getEndpoint('llm_api');

          const modelData = await this.fetchData(endpoint);

          model.setModelData(modelData);

          if (sidePanel) {
            sidePanel.setBusy(false);
          }

        } catch (error) {

          if (sidePanel) {
            sidePanel.setBusy(false);
          }

          MessageBox.error(error.message);

          const message = new Message({
              message: error.message,
              description: resourceBundle.getText("communicationError"),
              type: MessageType.Error
          });
          
          Messaging.addMessages(message);
          
        }

      },

      _loadChatMessages: async function () {

        const view = this.getView();

        let model = view.getModel("chat");

        const endpoint = this.getEndpoint("chat");

        try {
        
          const modelData = await this.fetchData(endpoint + "&id=" + Chat.chatId);

          model.setData(modelData);

          return modelData;

        } catch (error) {

          MessageBox.error(error.message);

          const message = new Message({
              message: error.message,
              description: resourceBundle.getText("communicationError"),
              type: MessageType.Error
          });
          
          Messaging.addMessages(message);

          return false;
          
        }

      },

      _loadUserInfo: async function () {
        
        const userInfo = await this.fetchData('/sap/bc/ui2/start_up');

        const view = this.getView();

        const model = view.getModel("userinfo");

        model.setData({
          email: userInfo.email,
          username: userInfo.fullName,
          userid: userInfo.id,
          initials: userInfo.email.slice(0, 2).toUpperCase()
        });

      }
       
    });
  });
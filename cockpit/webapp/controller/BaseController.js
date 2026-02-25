sap.ui.define(
	[
		"sap/ui/core/UIComponent",
		"sap/ui/core/mvc/Controller",
		"sap/ui/core/Messaging",
		"sap/ui/core/routing/History",
		"sap/m/MessagePopover",
		'sap/m/MessageItem'
	],
	function (UIComponent, Controller, Messaging, History, MessagePopover, MessageItem) {
		"use strict";

		return Controller.extend("aaic.cockpit.controller.BaseController", {

			getRouter: function () {
				return UIComponent.getRouterFor(this);
			},

			onNavBack: function (event) {

				let history, previousHash;

				history = History.getInstance();
				previousHash = history.getPreviousHash();

				Messaging.removeAllMessages();

				if (previousHash !== undefined) {
					window.history.go(-1);
				} else {
					this.getRouter().navTo("RouteMain", {}, true /*no history*/);
				}
			},

			onNavBackMaster: function (route) {

				const ownerComponent = this.getOwnerComponent();

				ownerComponent.setOnHoldNavigation(route);
        
				const preventDataLoss = ownerComponent.preventDataLoss();

				if (preventDataLoss === true) {
					return;
				} else {

					// Clear on hold navigation 
					ownerComponent.setOnHoldNavigation();

					Messaging.removeAllMessages();

					const router = this.getRouter();

					router.navTo(route);

				}

			},

			setMessagePopover: function (view) {

				this._getMessagePopover();

				view.addDependent(this._messagePopover);

			},

			openMessagePopover: function (event) {

				this.onMessagePopoverPress(event);

			},

			onMessagePopoverPress: function (event) {

				if (this._messagePopover.isOpen()) {
					this._messagePopover.focus();
					return;
				}

				this._messagePopover.toggle(event.getSource());
			},

			getEndpoint: function (resource) {

				let baseUrl = '/sap/yaai/';
				let urlParams = '?sap-client=001&r=' + Date.now();

				return baseUrl + resource + urlParams;

			},

			fetchData: async function (url, options = {}) {

				const defaultOptions = {
					method: 'GET',
					headers: {
						'Cache-Control': 'no-cache',
						'Pragma': 'no-cache',
						'Content-Type': 'application/json'
					},
					...options
				};

				try {
					const response = await fetch(url, defaultOptions);

					if (!response.ok) {
						throw new Error(`HTTP error! status: ${response.status}`);
					}

					// Handle different response types
					const contentType = response.headers.get('content-type');
					if (contentType && contentType.includes('application/json')) {
						return await response.json();
					} else {
						return await response.text();
					}
				} catch (error) {
					console.error('Error fetching data:', error);
					throw error;
				}
			},

			//################ Private APIs ###################

			_getMessagePopover: function () {

				if (!this._messagePopover) {
					this._messagePopover = new MessagePopover({
						items: {
							path: "message>/",
							template: new MessageItem(
								{
									title: "{message>message}",
									subtitle: "{message>additionalText}",
									type: "{message>type}",
									description: "{message>description}"
								})
						}
					});
				}

				return this._messagePopover;

			},

			_formatDateYYYYMMDD: function (date) {
				const year = date.getFullYear();
				const month = String(date.getMonth() + 1).padStart(2, '0');
				const day = String(date.getDate()).padStart(2, '0');
				return `${year}${month}${day}`;
			},

			_formatTimeHHMMSS: function (date) {
				const hours = String(date.getHours()).padStart(2, '0');
				const minutes = String(date.getMinutes()).padStart(2, '0');
				const seconds = String(date.getSeconds()).padStart(2, '0');
				return `${hours}${minutes}${seconds}`;
			},

			_isDirty: function() {

				const ownerComponent = this.getOwnerComponent();

				return ownerComponent.isDirty();        	

			}

		});
	}
);

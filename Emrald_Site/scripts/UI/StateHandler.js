﻿// Copyright 2021 Battelle Energy Alliance

/// <reference path="Window.js" />

'use strict';
//This file contains overrides or extended functions for mxGraph to support the StateShape and TableShape.  
// -- StateShape is the mxGraph's box shape, 
// -- TableShape is custom HTML table and nested table called the "Label" within StateShape. 

//==========================================================
// Must be disabled to compute positions inside the DOM tree of the cell label.
mxGraphView.prototype.optimizeVmlReflows = false;

// If connect preview is not moved away then getCellAt is used to detect the cell under
// the mouse if the mouse is over the preview shape in IE (no event transparency), ie.
// the built-in hit-detection of the HTML document will not be used in this case. This is
// not a problem here since the preview moves away from the mouse as soon as it connects
// to any given table row. This is because the edge connects to the outside of the row and
// is aligned to the grid during the preview.
mxConnectionHandler.prototype.movePreviewAway = false;

// Disables foreignObject support for Webkit because scrollbars in
// HTML labels do not work if x- or y-attribute of foreignObject != 0
// see http://code.google.com/p/chromium/issues/detail?id=35545
// also all HTML background is not visible if the vertex has a fill
// color in SVG, which in turn is required for a shadow in mxGraph
mxClient.NO_FO = mxClient.NO_FO || mxClient.IS_GC || mxClient.IS_SF;

// Enables move preview in HTML to appear on top
mxGraphHandler.prototype.htmlPreview = true;

// Enables connect icons to appear on top of HTML
mxConnectionHandler.prototype.moveIconFront = true;

// Defines an icon for creating new connections in the connection handler.
// This will automatically disable the highlighting of the source vertex.
mxConnectionHandler.prototype.connectImage = new mxImage('images/connector.gif', 16, 16);

//This overrides the check to see if the edge is valid (when you first hover it will be red or green)
mxGraph.prototype.getEdgeValidationError = function (edge, source, target) {
  if (edge != null && !this.isAllowDanglingEdges() && (source == null || target == null)) {
    return '';
  }

  if (edge != null && this.model.getTerminal(edge, true) == null &&
    this.model.getTerminal(edge, false) == null) {
    return null;
  }

  // Checks if we're dealing with a loop
  if (!this.allowLoops && source == target && source != null) {
    return '';
  }

  // Checks if the connection is generally allowed
  if (!this.isValidConnection(source, target)) {
    return '';
  }

  if (source != null && target != null) {
    var error = '';

    // Checks if the cells are already connected
    // and adds an error message if required			
    if (!this.multigraph) {
      var tmp = this.model.getEdgesBetween(source, target, true);

      // Checks if the source and target are not connected by another edge
      if (tmp.length > 1 || (tmp.length == 1 && tmp[0] != edge)) {
        if (source.value.dataType != "events") {
          error += (mxResources.get(this.alreadyConnectedResource) ||
            this.alreadyConnectedResource) + '\n';
        }
        else if (tmp[0].source.edges) {
          var eventIndex = mainApp.graph.sourceRowActionNumber;
          if (source.value.items.length > eventIndex) {
            var sourceEvent = source.value.items[eventIndex];
            var sourceEActions = sourceEvent.eActions;
            var eventEdges = [];
            for (var i = 0; i < tmp[0].source.edges.length; i++) {
              for (var j = 0; j < sourceEActions.length; j++) {
                //collect all the edges within the event
                if (tmp[0].source.edges[i].value.name.indexOf(sourceEActions[j].name + " ->") > -1) {
                  /*eventEdges.push(tmp[0].source.edges[i]); */
                  error += (mxResources.get(this.alreadyConnectedResource) ||
                    this.alreadyConnectedResource) + '\n';
                }
              }
            }
            /*for (var k = 0; k < eventEdges.length; k++) {
                if (target.value.State.name == eventEdges[k].value.toState) {
                    error += (mxResources.get(this.alreadyConnectedResource) ||
                        this.alreadyConnectedResource) + '\n';
                }
            }*/
          }

        }


      }
    }

    // Gets the number of outgoing edges from the source
    // and the number of incoming edges from the target
    // without counting the edge being currently changed.
    var sourceOut = this.model.getDirectedEdgeCount(source, true, edge);
    var targetIn = this.model.getDirectedEdgeCount(target, false, edge);

    // Checks the change against each multiplicity rule
    if (this.multiplicities != null) {
      for (var i = 0; i < this.multiplicities.length; i++) {
        var err = this.multiplicities[i].check(this, edge, source,
          target, sourceOut, targetIn);

        if (err != null) {
          error += err;
        }
      }
    }

    // Validates the source and target terminals independently
    var err = this.validateEdge(edge, source, target);

    if (err != null) {
      error += err;
    }

    return (error.length > 0) ? error : null;
  }

  return (this.allowDanglingEdges) ? null : '';
};

//overrides to detect when a connection is made, we need to capture
var connectionHandlerMouseUp = mxConnectionHandler.prototype.mouseUp;
mxConnectionHandler.prototype.mouseUp = function (sender, me) {

  var getActionData = function (state, iid) {
    var foundData = null;
    for (var i = 0; i < state.items.length; i++) {
      if (state.items[i].itemId == iid) {
        foundData = state.items[i].value;
        break;
      }
    }
    return foundData;
  }

  var getEventActionData = function (state, iid, aid) {
    var foundData = null;
    for (var i = 0; i < state.items.length; i++) {
      if (state.items[i].eActions) {
        var eActs = state.items[i].eActions;
        for (var j = 0; j < eActs.length; j++) {
          if (eActs[j].itemId == iid && eActs[j].actionId == aid) {
            foundData = eActs[j].value;
            break;
          }
        }
      }
      if (foundData)
        break;
    }
    return foundData;
  }

  var isConnectedState = function (newStates, sname) {
    for (var i = 0; i < newStates.length; i++) {
      if (newStates[i].toState == sname) {
        return true;
      }
    }
    return false;
  }


  var allowConnection = true;

  //only true if an edge is in the preview state, being connected.
  if (this.edgeState) {
    if (this.error == null) {
      var source = (this.previous != null) ? this.previous.cell : null;
      var target = null;

      if (source && (source.value.dataType == "events" || source.value.dataType == "actions")) {
        if (this.constraintHandler.currentConstraint != null &&
          this.constraintHandler.currentFocus != null) {
          target = this.constraintHandler.currentFocus.cell;
        }

        if (target == null && this.marker.hasValidState()) {
          target = this.marker.validState.cell;
        }

        if (target && target.value.dataType == "state") {
          var tState = sender.getView().getState(target);
          var sState = sender.getView().getState(source);
          target.value.ownerID = target.getId();
          source.value.ownerID = source.getId();

          var tr = sState.sourceElement;
          if (tr)
            delete sState.sourceElement;

          var actionId = -1;
          if (tr) {
            if (source && source.value.dataType == "events") {
              var td = tr.querySelector("td[actionid]");
              var itemId = td.getAttribute("itemid");
              if (itemId && itemId !== "")
                itemId = +itemId; //convert to integer
              else
                itemId = -1;
              var actionId = td.getAttribute("actionid");
              if (actionId && actionId !== "")
                actionId = +actionId;
              else
                actionId = -1;

              if (actionId >= 0 && itemId >= 0) {
                //var eventData = getActionData(source.value, itemId);
                //if (eventData) {
                //  eventData.eventId = itemId;
                //}
                var actionData = getEventActionData(source.value, itemId, actionId);
                if (actionData) { // && actionData.newStates) {
                  var newState = {
                    toState: target.value.State.name,
                    prob: -1,
                    failDesc: ""
                  }
                  var linkData = this.edgeState.cell.value;
                  linkData.name = actionData.name + " -> " + target.value.State.name;
                  linkData.itemId = itemId;
                  linkData.actionId = actionId;
                  linkData.toState = target.value.State.name;
                  linkData.linkState = newState;
                  linkData.baseDataType = source.value.dataType;

                  if (!actionData.newStates) {
                    actionData.newStates = [];
                  }

                  if (!isConnectedState(actionData.newStates, target.value.State.name)) {
                    actionData.newStates.push(newState);
                    actionData.itemId = itemId;
                    actionData.actionId = actionId;

                    var model = mainApp.graph.getDefaultParent().value;
                    var sb = model.sidebar;
                    if (sb) {
                      sb.notifyDataChanged(true);
                    }
                  }
                }
                else
                  allowConnection = false;
              }
            }
            else if (source && source.value.dataType == "actions") {
              var th = tr.querySelector("td[itemid]");
              var itemId = th.getAttribute("itemid");
              itemId = (itemId && itemId !== "") ? +itemId : -1;
              if (itemId >= 0) {
                var actionData = getActionData(source.value, itemId);
                if (actionData) {// && actionData.newStates) {
                  var newState = {
                    toState: target.value.State.name,
                    prob: -1,
                    failDesc: "",
                  }
                  var linkData = this.edgeState.cell.value;
                  linkData.name = actionData.name + " -> " + target.value.State.name;
                  linkData.itemId = itemId;
                  linkData.actionId = actionId;
                  linkData.toState = target.value.State.name;
                  linkData.linkState = newState;
                  linkData.baseDataType = source.value.dataType;

                  if (!actionData.newStates) {
                    actionData.newStates = [];
                  }
                  //duplicate connection is not allowed.
                  if (!isConnectedState(actionData.newStates, target.value.State.name)) {
                    actionData.newStates.push(newState);
                    actionData.itemId = itemId;
                    actionData.actionId = -1;

                    var model = mainApp.graph.getDefaultParent().value;
                    var sb = model.sidebar;
                    if (sb) {
                      sb.notifyDataChanged(true);
                    }
                  }
                }
                else {
                  allowConnection = false;
                }
              }
            }
          }
        }
      }
    }
  }
  if (allowConnection)
    connectionHandlerMouseUp.apply(this, arguments);
  else
    alert("Connect not allowed here.");
}

// Overrides target perimeter point for connection previews
mxConnectionHandler.prototype.getTargetPerimeterPoint = function (state, me) {
  // Determines the y-coordinate of the target perimeter point
  // by using the currentRowNode assigned in updateRow
  var y = me.getY();

  if (this.currentRowNode != null) {
    y = getRowY(state, this.currentRowNode);
  }


  // Checks on which side of the terminal to leave
  var x = state.x;

  if (this.previous.getCenterX() > state.getCenterX()) {
    x += state.width;
  }

  return new mxPoint(x, y);
};

// Overrides source perimeter point for connection previews
mxConnectionHandler.prototype.getSourcePerimeterPoint = function (state, next, me) {
  var y = me.getY();

  if (this.sourceRowNode != null) {
    y = getRowY(state, this.sourceRowNode);
  }

  // Checks on which side of the terminal to leave
  var x = state.x;

  if (next.x > state.getCenterX()) {
    x += state.width;
  }

  return new mxPoint(x, y);
};

// Disables connections to invalid rows
mxConnectionHandler.prototype.isValidTarget = function (cell) {
  return (cell.value && cell.value.dataType == "state");
  //return this.currentRowNode != null;  // to allow connect to individual table row.
};

//Ties the cell to the cell's data model object specified with ownerID. 
mxGraph.prototype.updateOwnership = function (cells) {
  if (!cells) {
    for (var c in this.model.cells) {
      var cell = this.model.cells[c];
      if (cell.value && cell.value.dataType == "state") {
        cell.value.ownerID = cell.getId();
      }
      if (cell.children) {
        this.updateOwnership(cell.children);
      }
    }
  } else {
    for (var i = 0; i < cells.length; i++) {
      var cell = cells[i];
      if (cell.value && cell.value.dataType == "state") {
        cell.value.ownerID = cell.getId();
      }
      if (cell.children) {
        this.updateOwnership(cell.children)
      }
    }
  }
}


//-----------------------------
/*
when an edge (link) is reconnect to another diagram, this handle of updating the link's information.
*/
var mxEdgeHandlerMouseUp = mxEdgeHandler.prototype.mouseUp;
mxEdgeHandler.prototype.mouseUp = function (sender, me) {
  if (this.index != null && this.marker != null) {
    var edge = this.state.cell;

    // Ignores event if mouse has not been moved
    if (me.getX() != this.startX || me.getY() != this.startY) {
      var terminal = this.marker.validState.cell;
      if (terminal) {
        if (edge.value) {
          edge.value.toState = terminal.value.State.name;
          edge.value.linkState.toState = terminal.value.State.name;
          var model = mainApp.graph.getDefaultParent().value;
          var sb = model.sidebar;
          if (sb) {
            sb.notifyDataChanged(true);
          }
        }
      }
    }
    mxEdgeHandlerMouseUp.apply(this, arguments);
  }
}
//-----------------------------

// Defines global helper function to get y-coordinate for a given cell state and row
var getRowY = function (state, r) {
  if (r)
    var y = r.top + r.height / 2;
  else
    var y = state.y;
  y = Math.min(state.y + state.height, Math.max(state.y, y));

  return y;
};


// Implements a special perimeter for table rows inside the table markup
// Note:  edge, start, end are mxGraphState.  isSource is boolean.
var mxGraphViewUpdateFloatingTerminalPoint = mxGraphView.prototype.updateFloatingTerminalPoint;
mxGraphView.prototype.updateFloatingTerminalPoint = function (edge, start, end, isSource) {
  var next = this.getNextPoint(edge, end, isSource);

  //an edge must be connected from a State cell.
  if (start.text && start.text.node) {
    var div = start.text.node.getElementsByTagName('div')[0];

  }
  else {
    mxGraphViewUpdateFloatingTerminalPoint.apply(this, arguments);
    return;
  }

  var x = start.x;
  var y = start.getCenterY();

  // Checks on which side of the terminal to leave
  if (next.x > x + start.width / 2) {
    x += start.width;
  }


  if (div != null) {
    y = start.getCenterY() - div.scrollTop;
    var clientRect = null;
    if (edge.cell.value && !this.graph.isCellCollapsed(start.cell)) {
      var row = edge.cell.value.sourceRow;
      var tr = null;
      //sourceRowNode is set and available only during the preview edge being connected.
      tr = this.graph.connectionHandler.sourceRowNode;
      if (tr && isSource && (start.cell.value.dataType == "events" || start.cell.value.dataType == "actions")) {

        start.sourceElement = tr;
        clientRect = tr.getClientRects()[0];
        if (clientRect) {
          edge.sourceElement = tr;
        }
        else if (edge.sourceElement) {
          //The current edge still has the sourceElement, which mean immediately after edge is connected, 
          //but mouseUp is not yet fired.  sourceElement is not available during moving the state's cell or redraw.
          tr = edge.sourceElement;
          delete edge.sourceElement;

          var td = tr.querySelector("td[actionid]");
          var itemId = td.getAttribute("itemid");
          var actionId = td.getAttribute("actionid");
          var atd = div.querySelector("td[itemid='" + itemId + "'][actionid='" + actionId + "']");
          if (atd) {
            clientRect = atd.getClientRects()[0];
          }
          if (clientRect) tr = atd;
        }
        else tr = null;
      }

      if (!tr) {
        //This part is use for drawing during loading of the diagram only.

        //determine where the edge is connecting from which area with the source state.
        if (isSource && edge.cell.value) {
          if (edge.cell.value.dataType == "NewStates") {
            // true only when diagram was loaded and not during interactively creation.
            var iId = edge.cell.value.itemId;  //the eventAction's event row number.
            var aId = edge.cell.value.actionId; //the eventAction's action row number.
            var cId = edge.cell.source.getId(); //the eventAction cell id.
            var trd = null;
            if (edge.cell.value.baseDataType == 'actions') //is the edge is connect from immediate Action cell?
              trd = div.querySelector("td[cellid='" + cId + "'][itemid='" + iId + "'][actionid='-1'][datatype='actions']");
            else //edge is connecting from eventAction's Action row.
              trd = div.querySelector("td[cellid='" + cId + "'][itemid='" + iId + "'][actionid='" + aId + "'][datatype='actions']");
            if (trd)
              clientRect = trd.getClientRects()[0];
          }
        }
        else {
          // HTML labels contain an outer table which is built-in
          var table = div.getElementsByTagName('table')[0];
          var trs = table.getElementsByTagName('tr');
          tr = trs[Math.min(trs.length - 1, row - 1)];
          if (tr)
            clientRect = tr.getClientRects()[0];
        }
      }
      //else {
      //  clientRect = tr.getClientRects()[0];
      //}

    }
    // Gets vertical center of source or target row
    if (isSource) {
      y = getRowY(start, clientRect);
    }
    else {
      y = getRowY(end, null);
    }

    // Keeps vertical coordinate inside start
    y = Math.min(start.y + start.height, Math.max(start.y + div.offsetTop, y));

    // Updates the vertical position of the nearest point if we're not
    // dealing with a connection preview, in which case either the
    // edgeState or the absolutePoints are null
    if (edge != null && edge.absolutePoints != null) {
      next.y = y;
    }
  }

  //set the end point of the polyline connection edge to the top of the target state, only if the edge has a target already.
  if (!isSource && edge.cell.target) {
    y = edge.cell.target.geometry.y + 10;
    next.y = y;  //also the edge's last bend to the same.
  }

  edge.setAbsoluteTerminalPoint(new mxPoint(x, y), isSource);

};


//==============================================
//When the main application object created, it calls this overriden function
//to setup conditions specific to StateEvent diagram.
var initializeApp = StateApp.prototype.Initialize;
StateApp.prototype.Initialize = function (graph) {
  mainApp.graph = graph;
  initializeApp.apply(this, arguments); //execute the based function.

  //Do not allow parent cell to grow when children are added.
  graph.extendParents = false;
  graph.extendParentsOnAdd = false;

  // Highlights the vertices when the mouse enters
  //var highlight = new mxCellTracker(graph, '#00FF00');

  mxEvent.disableContextMenu(graph.container);

  //do not allow cell to be move outside of its parent.
  graph.graphHandler.removeCellsFromParent = false;
  //------------------------------------------
  // Installs a handler for double click events in the graph
  // properties editors for various types.
  graph.addListener(mxEvent.DOUBLE_CLICK, function (sender, evt) {
    var foundCell = false;
    var target = evt.getProperty('event').target;
    var dataType = target.getAttribute('dataType');
    if (dataType) {
      if (target.nodeName == 'TD') {
        var cellId = target.getAttribute('cellid');
        var itemId = target.getAttribute('itemid');
        if (cellId !== null && itemId !== null) {
          itemId = +itemId;
          cellId = +cellId;
          var cell = mainApp.graph.getModel().getCell(cellId);
          var dataObj = cell.value.items[itemId];
          if (!dataObj) {
            for (var i = 0; i < cell.value.items.length; i++) {
              if (cell.value.items[i].eActions) {
                for (var j = 0; j < cell.value.items[i].eActions.length; j++) {
                  if (cell.value.items[i].eActions[j].itemId == itemId) {
                    dataObj = cell.value.items[i].eActions[j];
                  }
                }
              }
              else {
                if (cell.value.items[i].itemId == itemId) {
                  dataObj = cell.value.items[i];
                }

              }
            }
          }
          var actionId = target.getAttribute("actionid");
          actionId = actionId ? +actionId : actionId;
          if (target.nodeName == 'TD' && dataType == 'actions') {
            if (actionId >= 0) { //event Action's Action
              var dataObj = this.getEventActionData(cell.value, itemId, actionId);
              if (dataObj) {
                this.editActionProperties(cell, dataObj);
                foundCell = true;
              }
            }
            else {//immediate action
              this.editActionProperties(cell, dataObj.value);
              foundCell = true;
            }
          }
          else if (target.tagName == "TD" && dataType == 'events') {    //event Action's action
            var dataObj = this.getEventActionData(cell.value, itemId, actionId);
            if (dataObj) {
              this.editActionProperties(cell, dataObj);
              foundCell = true;
            }
          }
        }
      }
      else if (target.nodeName == 'TH' && dataType == 'events') {
        var cellId = target.getAttribute('cellId');
        cellId = cellId ? +cellId : cellId;
        if (cellId) {
          var cell = mainApp.graph.getModel().getCell(cellId);
          var itemId = target.getAttribute('itemId');
          itemId = itemId ? +itemId : itemId;
          if (cell && itemId >= 0) {
            var dataObj = cell.value.items[itemId];
            this.editEventProperties(cell, dataObj.value);
            foundCell = true;
          }
        }
      }
    }
    else {
      var cell = mainApp.graph.getSelectionCell();
      if (cell && cell.isEdge()) {
        this.editLinkProperties(cell, cell.value.linkState);
        foundCell = true;
      }
      else if (cell && cell.value.State) {
        this.editStateProperties(cell, mainApp.graph);
        foundCell = true;
      }
    }
    //if everything is checked out and not found one, it must be a state.
    if (!foundCell) {
      var cell = mainApp.graph.getSelectionCell();
      if (cell && cell.value.State) {
        this.editStateProperties(cell, mainApp.graph);
      }

      //if there is no cell selected, then default to edit diagram properties.
      if (!cell) {
        this.editDiagramProperties(null, mainApp.graph);
      }

    }

    evt.consume();

  }.bind(this));

  /*
  graph.addListener(mxEvent.CLICK, function (sender, evt) {
      var e = evt.getProperty('event'); // mouse event
      var cell = evt.getProperty('cell'); // cell may be null
      if (cell != null) {
          // Do something useful with cell and consume the event
          evt.consume();
      }
  });
  */
  //------------------------------------------
  var graphstartEditingAtCell = this.graph.startEditingAtCell;
  graph.startEditingAtCell = function (cell, evt) {
    if (cell.value && (typeof cell.value !== "String") && !cell.edge) {
      //user the override editor window.
      //this.editor.editUserObject(this.graph, cell, evt);

    }
    else {
      //call the ancestor's copy
      graphstartEditingAtCell.apply(graph, arguments);
    }
  }.bind(this);
  //------------------------------------------
  var graphLabelChanged = this.graph.labelChanged;
  graph.labelChanged = function (cell, newValue, trigger) {
    var name = (trigger != null) ? trigger.fieldname : null;
    if (name != null) {
      var value = mxUtils.clone(cell.value);
      value[name] = newValue;
      newValue = value;

      graphLabelChanged.apply(this, arguments);
    }
  }
  //------------------------------------------
  var graphGetEditingValue = graph.getEditingValue;
  graph.getEditingValue = function (cell, evt) {
    //for debugging only.
    if (cell.edge) {
      if (cell.value)
        alert(JSON.stringify(cell.value));
      else
        alert("Connector does not has data.");
      return;
    }


    if (cell.value.dataType == "state") {
      evt.fieldname = cell.value.getName();
      return cell.value.getName();
    }
    else
      return graphGetEditingValue.apply(this, arguments);
  }

  //======================================================
  // for table cells.

  // Allows new connections to be made but do not allow existing
  // connections to be changed for the sake of simplicity of this
  // example
  graph.setCellsDisconnectable(true);  //should be set to false here.
  graph.setAllowDanglingEdges(false);
  graph.setConnectable(true);
  graph.setCellsEditable(true);
  //------------------------------------------
  // Override folding to allow for tables as well as StateShape, always foldable.
  var graphIsCellFoldable = graph.isCellFoldable;
  graph.isCellFoldable = function (cell, collapse) {
    // return this.getModel().isVertex(cell);
    var state = this.getView().getState(cell);
    if (state && state.shape && ((state.shape instanceof TableShape) || (state.shape instanceof StateShape)))
      return true;
    return graphIsCellFoldable.apply(this, arguments);
  };
  //------------------------------------------
  var graphIsCellSelectable = graph.isCellSelectable;
  graph.isCellSelectable = function (cell) {
    var state = this.getView().getState(cell);
    if (state && state.shape && (state.shape instanceof StateShape))
      return true;
    if (state && state.shape instanceof mxConnector)
      return true;

    if (state && state.shape && (state.shape instanceof TableShape))
      return true;

    return graphIsCellSelectable.apply(this, arguments);
  }
  graph.setCellsSelectable(true);
  //------------------------------------------
  //since not all of our vertex are going to be HTML Label, 
  //we must selective tell which one is.  Only Action/Event shapes are HTML labels.
  var graphIsHtmlLabel = graph.isHtmlLabel;
  graph.isHtmlLabel = function (cell) {
    var state = this.getView().getState(cell);
    if (state && state.shape && ((state.shape instanceof TableShape)))// || (state.shape instanceof StateShape)))
      return true;
    else if (state && state.shape && state.shape instanceof StateShape)
      return true;

    return graphIsHtmlLabel.apply(this, arguments);
  }
  //------------------------------------------
  // Enables HTML markup in all labels
  // for display table cell, this is a must!!
  graph.setHtmlLabels(true);
  graph.setTooltips(true);

  // Overrides connectable state
  graph.isCellConnectable = function (cell) {
    return !this.isCellCollapsed(cell);
  };
  //------------------------------------------
  // Scroll events should not start moving the vertex
  graph.cellRenderer.isLabelEvent = function (state, evt) {
    if (state && state.shape && state.shape instanceof TableShape) {
      var source = mxEvent.getSource(evt);

      // FIXME: No scroll events in GC
      return state.text != null &&
        source != state.text.node &&
        source != state.text.node.getElementsByTagName('div')[0];
    }
  };
  //------------------------------------------
  // Adds scrollbars to the outermost div and keeps the DIV position and size the same as the vertex.
  var oldRedrawLabel = graph.cellRenderer.redrawLabel;
  graph.cellRenderer.redrawLabel = function (state) {

    //When the shape is redrawing its label, mxGraph destroys the content, so we need to re-install drop handler. 
    var installDropHandler = function (pdiv, div) {

      // handler for item drag over response
      pdiv.ondragover = function (evt) {
        var isActionEvent = false;
        for (var i = 0; i < evt.dataTransfer.types.length; i++) {
          var type = evt.dataTransfer.types[i].toLowerCase();
          if (type == div.getAttribute('datatype').toLowerCase()) {
            isActionEvent = true;
            break;
          }

          //actions can be dropped onto an event but has to be on a row.
          if (type == 'actions' && div.getAttribute('datatype').toLowerCase() == 'events') {
            //actions can be dropped onto an event but has to be on a row.
            if (evt.target.tagName == 'TD' || evt.target.tagName == 'IMG') {
              isActionEvent = true;
              break;
            }

            if (evt.target.tagName == 'TH') {
              //Add as Event Actions item
              var target = evt.target;

              //if (!target.getAttribute('cellid')) {
              if (target.tagName == "IMG") {
                //allow drop on the image "IMG", set to TD parent
                isActionEvent = true;
                break;
              }

              if (target.children.length > 0 && target.children[0].tagName == "IMG") {
                //allow drop on the image icon TD, get the sibling TD
                isActionEvent = true;
                break;
              }
              else {
                //dropped on the incorrect TD, walk up to DOM tree to find the next TD.
                var el = target.parentNode;
                while (el && el.tagName != 'TD') {
                  el = el.parentNode;
                }
                if (!el) {  //if no TD up, not allow drop.
                  isActionEvent = false;
                  break;
                }
                else if (el && el.tagName == 'TD') {
                  isActionEvent = true;
                  break;
                }
              }
            }
            //}
          }
        }

        if (isActionEvent) {
          evt.preventDefault();
          evt.stopPropagation();
        }
      }.bind(pdiv);

      //handler for actual drop of drag over item.
      pdiv.ondrop = function (evt) {
        var atype = 'actions';
        var newAction = evt.dataTransfer.getData("Actions");
        if (newAction == '') {
          newAction = evt.dataTransfer.getData('Events');
          atype = 'events';
        }

        var model = mainApp.graph.getDefaultParent().value;
        var sb = model.sidebar;

        if (newAction !== '') {
          var target = evt.target;
          newAction = JSON.parse(newAction);
          newAction.dataType = atype;

          if ((atype == 'actions') &&
            (target.tagName == 'TD' || evt.target.tagName == 'TH' || evt.target.tagName == "IMG")
            && (div.getAttribute('datatype').toLowerCase() == 'events')) {

            //Add as Event Actions item
            //if (!target.getAttribute('cellid')) {
            //The drop action can only be add to a "TD" cell.
            if (target.tagName == "IMG") {
              //dropped on the image "IMG", set to TD parent
              target = target.parentNode;
            }

            if (target.children.length > 1 && target.children[0].tagName == "IMG") {
              //drop on the image icon TD, get the sibling TD
              target = target.parentNode.children[1];
            }
            else {
              //dropped on the incorrect TD, walk up to DOM tree to find the next TD.
              var el = target.parentNode;
              while (el && el.tagName != 'TD') {
                el = el.parentNode;
              }
              target = el;
            }
            //}

            //dropping an action into event action.
            // if dropped on the title area, it adds a new action.
            // if dropped on an existing action, it replaces it.
            if (target) {
              //a Event Action item (Title - TH) has these two attributes.
              var cellId = target.getAttribute('cellid');
              var itemId = target.getAttribute('itemid');

              //only a event action item has actionId attribute.
              var actionId = target.getAttribute('actionid');

              cellId = cellId ? +cellId : -1;
              itemId = itemId ? +itemId : -1;
              actionId = actionId ? +actionId : -1;

              if (cellId >= 0 && itemId >= 0) {
                var cell = mainApp.graph.getModel().getCell(cellId);
                var item = cell.value.items[itemId];
                if (actionId >= 0) {
                  //Item was dropped on an action, do a replacement.
                  var oldData = item.actions[actionId];
                  newAction.targetStateId = oldData.targetStateId;
                  newAction.actionId = oldData.actionId;
                  item.actions[actionId] = newAction;
                }
                else {
                  //Action item was dropped on the EventAction header, insert a new action.
                  var stateName = state.cell.parent.value.State.name;
                  for (var j = 0; j < sb.StateList.length; j++) {
                    var sbState = sb.StateList[j];
                    if (sbState.State.name == stateName) {
                      if (sbState.State.eventActions == null
                        || sbState.State.eventActions == undefined) {
                        sbState.State.eventActions = [{ moveFromCurrent: true, actions: [] }]
                        itemId = 0;
                      }
                      else if (sbState.State.eventActions.length <= itemId) {
                        sbState.State.eventActions[itemId] = { moveFromCurrent: true, actions: [] };
                      }
                      sbState.State.eventActions[itemId].actions.push(newAction.name);
                      var act = { name: newAction.name, value: newAction, dataType: 'actions', itemId: itemId, actionId: 0 }

                      var model = graph.getModel();
                      model.beginUpdate();
                      try {
                        item.eActions.push(act);
                      }
                      finally {
                        model.endUpdate();
                      }

                      //Connection must be done in separate update because we need the new cell to be realized into mxGraph first.
                      model.beginUpdate();
                      try {
                        //if the action linked to an state on the diagram, create the appropriate connection.
                        var actCell = sbState.actionCell;
                        var evtCell = sbState.eventCell;

                        for (var p = 0; p < newAction.newStates.length; p++) {
                          var ns = deepClone(newAction.newStates[p]);
                          ns.linkState = newAction.newStates[p];
                          ns.dataType = "NewStates";
                          ns.baseDataType = 'events';
                          ns.itemId = itemId;
                          ns.actionId = 0;
                          ns.sourceRow = 0;
                          ns.targetRow = -1;
                          var targetCell = graph.getCellByStateName(ns.toState);
                          if (targetCell) {
                            ns.name = newAction.name + ' -> ' + targetCell.value.State.name;
                            //Add a green dashed line
                            if (sbState.State.eventActions[itemId].moveFromCurrent != true) {
                              var edge = graph.insertEdge(graph.getDefaultParent(), null, null, evtCell, targetCell, 'dashed=1;fontColor=#1E8449 ;strokeColor=#1E8449;');
                              edge.value = ns;
                            }
                            //add a normal black line
                            else {
                              var edge = graph.insertEdge(graph.getDefaultParent(), null, null, evtCell, targetCell, 'dashed=0;fontColor=black ;strokeColor=black;');
                              edge.value = ns;
                            }
                          }
                        }
                      }
                      finally {
                        model.endUpdate();
                      }
                      break;
                    }
                  }
                }
              }
            }
          } else {
            //add as Immediate Actions item and Event Action items.
            if (atype == "actions") {
              state.cell.value.items.push({ itemId: itemId, dataType: atype, Action: newAction });
              //add to immediate action
              var stateName = state.cell.parent.value.State.name;
              for (var j = 0; j < sb.StateList.length; j++) {
                if (sb.StateList[j].State.name == stateName) {
                  sb.StateList[j].State.immediateActions.push(newAction.name);
                }
              }

            }
            else if (atype = "events") {
              state.cell.value.items.push({ itemId: itemId, dataType: atype, Event: newAction });
              //add to immediate action
              var stateName = state.cell.parent.value.State.name;

              for (var j = 0; j < sb.StateList.length; j++) {
                if (sb.StateList[j].State.name == stateName) {
                  sb.StateList[j].State.events.push(newAction.name);
                  var evAct = {
                    actions: [],
                    moveFromCurrent: false
                  }
                  sb.StateList[j].State.eventActions.push(evAct);
                }
              }
            }
          }
          var pCell = graph.getModel().getParent(state.cell);  //a table cell
          var pState = graph.getView().getState(pCell);
          mainApp.graph.fireEvent(new mxEventObject(mxEvent.UPDATE_CELL_SIZE, "cell", pCell,
            "StateShape", pState.shape));
        }
      }.bind(pdiv);
    } //installDropHandler

    oldRedrawLabel.apply(this, arguments); // "supercall"
    var graph = state.view.graph;
    //var s = graph.view.scale;
    if (graph.getModel().isVertex(state.cell) && state.text != null) {
      if (state.shape instanceof TableShape) {                                                             
        // Scrollbars are on the div
        state.text.node.style.overflow = 'hidden';
        //get the main TableShape panel and should be only one.
        var div = state.text.node.getElementsByTagName('div')[0];

        if (div != null) {
          // Adds height of the title table cell
          var oh = 20;


          var itemCnt = 0;
          if (!graph.isCellCollapsed(state.cell))
            var itemCnt = state.cell.value.items.length;

          installDropHandler(div.parentElement, div);
          //div.style.zoom = s;
          div.style.display = 'block';
          div.style.width = '100%'; //Math.max(1, Math.round(state.width / s)) + 'px';
          //div.style.height = Math.max(1, Math.round(((state.height + 4 * itemCnt) / s) - oh)) + 'px';

          // Installs the handler for updating connected edges
          if (div.scrollHandler == null) {
            div.scrollHandler = true;

            mxEvent.addListener(div, 'scroll', mxUtils.bind(this, function (evt) {
              graph.view.invalidate(state.cell, false, true);
              graph.view.validate();
            }));

            mxEvent.addListener(div, 'mouseup', mxUtils.bind(this, function (evt) {
              if (!this.isLabelEvent(state, evt)) {
                graph.view.invalidate(state.cell, false, true);
                graph.view.validate();
              }
            }));
          }


        }
      }
      else if (state.shape instanceof StateShape) {
        //installDropHandler(state.text.node);
        state.text.node.style.fontSize = '12pt';
        state.text.node.style.fontWeight = 'bold';
        state.shape.updateShape(graph, state.cell);
      }
    }
  };
  //------------------------------------------
  //search and limit the connection icon to show on the 
  //Immediate Action items and the Event Action's action item only.
  graph.connectionHandler.updateRow = function (aTarget) {
    //target -- the topmost element where the mouse cursor is on.

    var target = aTarget;
    //walk up the DOM tree to find a TR parent (table row).
    while (target != null && target.nodeName != 'TR') {
      target = target.parentNode;
    }

    this.currentRow = null;

    // Stores the current row number in a property so that it can
    // be retrieved to create the preview and final edge
    if (target && target.parentNode) {
      var rowNumber = 0;
      var current = target.parentNode.firstChild;

      while (target != current && current != null) {
        current = current.nextSibling;
        rowNumber++;
      }

      this.currentRow = rowNumber + 1;
    }
    return target;
  };
  //------------------------------------------
  // Adds placement of the connect icon based on the mouse event target (row)
  graph.connectionHandler.updateIcons = function (state, icons, me) {
    var target = me.getSource();
    icons[0].node.style.visibility = 'hidden';

    if ((target.nodeName == 'TD' || target.nodeName == 'IMG')
      && target.getAttribute('dataType') == 'actions'
      && target.getAttribute("itemId")) {
      target = this.updateRow(target);

      if (target != null) {
        var dRect = target.getClientRects()[0];

        //TODO: we need to compensate the Y for content scroll, i.e. when the view port is smaller
        //than the actual canvas.  The Connection icon appears incorrect if the canvas is scrolled.

        icons[0].node.style.visibility = 'visible';
        icons[0].bounds.x = state.x + state.width - this.icons[0].bounds.width;
        icons[0].bounds.y = dRect.top + dRect.height / 2 - this.icons[0].bounds.height / 2;
        icons[0].redraw();

        this.currentRowNode = target;
      }
    }
  };
  //------------------------------------------
  // Updates the targetRow in the preview edge State
  var oldMouseMove = graph.connectionHandler.mouseMove;
  graph.connectionHandler.mouseMove = function (sender, me) {
    if (this.edgeState != null) {
      this.currentRowNode = this.updateRow(me.getSource());

      if (this.currentRow != null) {
        this.edgeState.cell.value.targetRow = this.currentRow;
      }
      else {
        this.edgeState.cell.value.targetRow = 0;
      }

      // Destroys icon to prevent event redirection via image in IE
      this.destroyIcons();
    }
    oldMouseMove.apply(this, arguments);
  };
  //------------------------------------------
  // Creates the edge state that may be used for preview
  // 'this' is pxConnectionHandler.
  graph.connectionHandler.createEdgeState = function (me) {
    //var relation = doc.createElement('Relation');
    //relation.setAttribute('sourceRow', this.currentRow || '0');
    //relation.setAttribute('targetRow', '0');

    var dataState = { name: "", dataType: "NewStates", itemId: -1, actionId: -1, prob: -1, desc: "", toState: "", baseDataType: "actions", linkState: null }
    dataState.sourceRow = this.currentRow || 0;
    dataState.targetRow = 0;
    var edge = this.createEdge(dataState);
    var style = this.graph.getCellStyle(edge);
    var state = new mxCellState(this.graph.view, edge, style);

    // Stores the source row in the handler
    this.sourceRowNode = this.currentRowNode;

    var el = this.currentRowNode.children[1];
    var rowNum = parseInt(el.getAttribute("itemid"));

    graph.sourceRowNumber = this.currentRow;

    graph.sourceRowActionNumber = rowNum;



    return state;
  };
  //------------------------------------------
  // Overrides getLabel to return empty labels for edges and
  // short markup for collapsed cells.
  graph.getLabel = function (cell) {
    var content = "";
    var state = this.getView().getState(cell);
    if (state && state.shape) {
      if (state.shape instanceof TableShape) {
        content = state.shape.getLabel(cell);
      }
      else if (state.shape instanceof StateShape) {
        content = cell.value.State.name;
        var rootPath = document.baseURI.substring(0, document.baseURI.lastIndexOf("/")+1);
        if (cell.value.State.stateType == "stStart")
          content = "<img src='" + rootPath + "images/green-dot.gif' style='width:15px;height:15px;margin-right:5px;' />" + content;
        if (cell.value.State.stateType == "stTerminal")
          content = "<img src='" + rootPath + "images/red-dot.png' style='width:10px;height:10px;margin-right:5px;' />" + content;
        if (cell.value.State.stateType == "stKeyState")
          content = content + "<img src='" + rootPath + "images/key.png' style='width:15px;height:15px;margin-left:5px;' />";

      }
      else if (state.shape instanceof mxConnector) {
        if (cell.value)
          content = cell.value.prob == -1 ? "" : cell.value.prob * 100 + '%';
      }
      return content;
    };
  }
  //------------------------------------------
  // User objects (data) for the individual cells
  var doc = mxUtils.createXmlDocument();

  // Same should be used to create the XML node for the table
  // description and the rows (most probably as child nodes)

  //var relation = doc.createElement('Relation');
  //relation.setAttribute('sourceRow', '4');
  //relation.setAttribute('targetRow', '6');
  //------------------------------------------
  //return the cell holding the state object match name.
  graph.getCellByStateName = function (name) {
    var foundCell = null;
    var cells = graph.getModel().cells;
    for (var i in cells) {
      var cell = cells[i];
      if (cell.value && cell.value.dataType == "state") {
        if (cell.value.State.name == name) {
          foundCell = cell;
          break;
        }
      }
    }
    return foundCell;
  }
  //------------------------------------------
  graph.getCellByStateId = function (id) {
    //return a cell whose value.id match the passed in id.
    var foundCell = null;
    var cells = graph.getModel().cells;
    for (var i in cells) {
      var cell = cells[i];
      if (cell.value && cell.value.dataType == "state") {
        if (cell.value.State.id == id) {
          foundCell = cell;
          break;
        }
      }
    }
    return foundCell;
  }
  //------------------------------------------
  graph.getStateAction = function (actName) {
    //Note: the root cell holds the entire data model for a diagram.
    var foundNode = null;
    var parent = graph.getDefaultParent();
    var actions = parent.value.ActionList;
    if (actions) {
      for (var i = 0; i < actions.length; i++) {
        var act = actions[i];
        if (act.Action.name == actName) {
          foundNode = act;
          break;
        }
      }
    }
    return foundNode;
  }
  //------------------------------------------
  graph.getStateEvent = function (evtName) {
    //Note: the root cell holds the entire data model for a diagram.
    var foundNode = null;
    var parent = graph.getDefaultParent();
    var events = parent.value.EventList;
    if (events) {
      for (var i = 0; i < events.length; i++) {
        var evt = events[i];
        if (evt.Event.name == evtName) {
          foundNode = evt;
          break;
        }
      }
    }
    return foundNode;
  }
  //------------------------------------------
  graph.getStateByName = function (stName) {
    var foundNode = null;
    var parent = graph.getDefaultParent();
    var states = parent.value.StateList;
    if (states) {
      for (var i = 0; i < states.length; i++) {
        if (states[i].State.name == stName) {
          foundNode = states[i];
          break;
        }
      }
    }
    return foundNode;
  }

  //------------------------------------------
  graph.getTooltipForCell = function (cell) {
    if (this.model.isEdge(cell)) {
      return 'Name: ' + cell.value.name + "\n" +
        'Item Id: ' + cell.value.itemId + '\n' +
        'Action Id: ' + cell.value.actionId + '\n' +
        'Type: ' + cell.value.baseDataType;
    }
    if (cell.value.dataType == 'state') {
      return 'Name: ' + cell.value.State.name + '\n' +
        'Desc: ' + cell.value.State.name + '\n' +
        'Type: ' + cell.value.State.stateType;
    }
    return null; //mxGraph.prototype.getTooltipForCell.apply(this, arguments);
  }

} //StateApp.initialization.
//------------------------------------------
StateApp.prototype.InitializeStyle = function (graph) {
  //make the connector line with round elbow.
  var style = graph.getStylesheet().getDefaultEdgeStyle();
  style[mxConstants.STYLE_ROUNDED] = true;
  //style[mxConstants.STYLE_EDGE] = mxEdgeStyle.ElbowConnector;
  //graph.alternateEdgeStyle = 'elbow=vertical';

  //make the module shape transparent and foldable.
  style = graph.getStylesheet().getDefaultVertexStyle();
  //style[mxConstants.STYLE_SHAPE] = 'module';
  style[mxConstants.STYLE_FILLCOLOR] = '#fffff0';
  style[mxConstants.STYLE_STARTSIZE] = 20;
  style[mxConstants.STYLE_FOLDABLE] = 1;

  graph.getStylesheet().putCellStyle('column', style);

  //====================================================
  //Style for table
  // Uses the entity perimeter (below) as default
  graph.stylesheet.getDefaultVertexStyle()[mxConstants.STYLE_VERTICAL_ALIGN] = mxConstants.ALIGN_TOP;
  graph.stylesheet.getDefaultVertexStyle()[mxConstants.STYLE_PERIMETER] =
    mxPerimeter.EntityPerimeter;
  graph.stylesheet.getDefaultVertexStyle()[mxConstants.STYLE_SHADOW] = true;
  graph.stylesheet.getDefaultVertexStyle()[mxConstants.STYLE_FILLCOLOR] = '#DDEAFF';
  graph.stylesheet.getDefaultVertexStyle()[mxConstants.STYLE_GRADIENTCOLOR] = '#A9C4EB';
  delete graph.stylesheet.getDefaultVertexStyle()[mxConstants.STYLE_STROKECOLOR];

  // Used for HTML labels that use up the complete vertex space (see
  // graph.cellRenderer.redrawLabel below for syncing the size)
  graph.stylesheet.getDefaultVertexStyle()[mxConstants.STYLE_OVERFLOW] = 'fill';

  // Uses the entity edge style as default
  graph.stylesheet.getDefaultEdgeStyle()[mxConstants.STYLE_EDGE] = mxEdgeStyle.EntityRelation;
  graph.stylesheet.getDefaultEdgeStyle()[mxConstants.STYLE_STROKECOLOR] = 'black';
  graph.stylesheet.getDefaultEdgeStyle()[mxConstants.STYLE_FONTCOLOR] = 'black';

};
//------------------------------------------
//Parameter pass to function subscribes to this event are:
//graph : the graph.
//evtObj: a mxEventObject which has the model in the properties, i.e. evtObj.properties.model.
//          evtObj.properties.parentCell: the parent cell, which the stateCell.
mxEvent.LOAD_DATA = 'notify_to_load_data';

//------------------------------------------
//When the main application is initialized and read, it calls LoadData so we can load data onto the view.
//return a list of state models.
mxGraph.prototype.getStateDiagram = function () {
  //when generating a json object for data to be saved, we don't want to modify the original objects to
  //remove unwanted properties.  The entire diagram object hierarchy is clone and also exclude wanted 
  //properties.

  var graph = this;
  function specialClone(item) {
    if (!item) { return item; } // null, undefined values check

    var types = [Number, String, Boolean],
      result;

    // normalizing primitives if someone did new String('aaa'), or new Number('444');
    types.forEach(function (type) {
      if (item instanceof type) {
        result = type(item);
      }
    });

    if (typeof result == "undefined") {
      if (Object.prototype.toString.call(item) === "[object Array]") {
        result = [];
        item.forEach(function (child, index, array) {
          if ((index == "dataType") || (index == "itemId") || (index == "actionId") || (index == "geometry")
            || (i == "sourceRow") || (i == "targetRow")
            || (typeof item[i] == mxCell)) { }
          //Do not copy these
          else
            result[index] = specialClone(child);
        });
      } else if (typeof item == "object") {
        // testing that this is DOM
        if (item.nodeType && typeof item.cloneNode == "function") {
          var result = item.cloneNode(true);
        } else if (!item.prototype) { // check that this is a literal
          if (item instanceof Date) {
            result = new Date(item);
          } else {
            // it is an object literal
            result = {};
            for (var i in item) {
              if ((i == "dataType") || (i == "itemId") || (i == "actionId") || (i == "geometry")
                || (i == "sourceRow") || (i == "targetRow")
                || (typeof item[i] == mxCell)) { }
              else
                result[i] = specialClone(item[i]);
            }
          }
        } else {
          // depending what you would like here,
          // just keep the reference, or create new object
          if (false && item.constructor) {
            // would not advice to do that, reason? Read below
            result = new item.constructor();
          } else {
            result = item;
          }
        }
      } else {
        result = item;
      }
    }

    return result;
  }

  var diagramData = {};
  var cells = graph.getModel().cells;

  //copy the diagram object from the root cell, if exists.
  for (var i in cells) {
    var cell = cells[i];
    if (cell.value && cell.value.dataType == "diagram") {
      diagramData = {
        id: cell.value.id,
        name: cell.value.name,
        desc: cell.value.desc,
        ActionList: specialClone(cell.value.ActionList),
        DiagramList: specialClone(cell.value.DiagramList),
        EventList: specialClone(cell.value.EventList),
        StateList: [],
        LogicNodeList: specialClone(cell.value.LogicNodeList),
        VariableList: specialClone(cell.value.VariableList)
      }
      break;
    }
  }

  //copy each State from all cells.
  for (var i in cells) {
    var cell = cells[i];
    if (cell.value && cell.value.dataType == "state") {
      var state = specialClone(cell.value.State);
      state.geometry = "{ x: " + cell.geometry.x +
        ", y: " + cell.geometry.y +
        ", width: " + cell.geometry.width +
        ", height: " + cell.geometry.height + "}";
      state = { State: state };
      diagramData.StateList.push(state);
    }
  }

  return diagramData;
}
//------------------------------------------
mxGraph.prototype.clearNew = function () {
  this.selectAll();
  var cells = this.getSelectionCells();
  this.removeCells(cells, true);
}



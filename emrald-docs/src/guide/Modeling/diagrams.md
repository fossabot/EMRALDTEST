# Diagrams
  Each diagram represents a particular piece of the model and the various conditions or states that this piece of the model can be in.  These pieces correlate to aspects of traditional PRA modeling and range from small-scale components to a large scope, overall plant response and design.  A diagram contains multiple states with the events that can occur, actions that can be executed and variables used.  These all define how the simulation may sift through the diagram over time.
  Additionally, some diagrams (Component and State) can also be evaluated to a Boolean depending on which state they are currently in. This is a main feature that when combined with a Component Logic Event, can greatly simplify a model. Unlike the more general plant response diagrams, these diagrams are restricted to only be in one state at a time, in order to execute the evaluation process.

## Creating a New Diagram
  On the Left Navigation Frame, right click on "Diagrams" and click "New Diagram". <br>
  <div style="width:300px">![Right Click for New Diagram](/images/Modeling/diagrams/NewDiagram1.PNG)</div>

  Fill out the dialogue box. It is best to select the correct type of diagram in the beginning as some modeling options are dependent on the type chosen. Press "OK". <br>
  <div style="width:500px">![New Diagram Dialogue Box](/images/Modeling/diagrams/NewDiagram2.PNG)</div>

  It will then open an empty diagram form in the Modeling Area. The diagram name should also appear in the Left Navigation Frame. <br>
  ![New Diagram Created](/images/Modeling/diagrams/NewDiagram3.PNG)

## Editing a Diagram

### Edit the Diagram Model
  On the Left Navigation Frame, click on "Diagrams" to expand the menu. Double clicking on the folders will expand them to reveal the individual diagrams. 

  **Option 1:**
  Double click on the individual diagram to open it in the Modeling Area.<br>
  ![Edit Diagram Model Option 1](/images/Modeling/diagrams/EditDiagram1.PNG)

  **Option 2:**
  Right click on the individual diagram then click "Open..." to open it in the Modeling Area.<br>
  ![Edit Diagram Model Option 2](/images/Modeling/diagrams/EditDiagram2.PNG)

### Edit the Diagram Properties
   Right clicking on the individual diagrams will open a menu. Click on "Edit Properties..." to edit the basic properties of that diagram. The same dialogue box that opened in the Modeling Area when the diagram was created will appear again and changes to the name, description, and type can be made.<br>
   ![Edit Diagram Properties](/images/Modeling/diagrams/EditDiagramProps.PNG)

### Deleting a Diagram
  If your diagram is open in the Modeling Area, first close it by clicking on the [X] in the top right corner of the Diagram window. On the Left Navigation Frame, right click on the individual diagram and click on "Delete" in the menu that appears.<br>
  <div style="width:300px">![Delete Diagram Step 1](/images/Modeling/diagrams/DeleteDiagram1.PNG)</div>

  A confirmation window will appear in the Modeling Area. Click "Yes."<br>
  ![Delete Diagram Step 2](/images/Modeling/diagrams/DeleteDiagram2.PNG)<br>

  The diagram will be deleted and no longer be listed in the Left Navigation Frame.<br>
  <div style="width:300px">![Delete Diagram Step 3](/images/Modeling/diagrams/DeleteDiagram3.PNG)</div>

## Elements of a Diagram
  ![Diagram Elements](/images/Modeling/diagrams/DiagramElements.PNG)

### <span style="color:red"> States </span>
  States are a logical representation for a current condition in a diagram represented by the rectangular blocks. They contain events and actions that perform tasks or direct the simulation to other states. <br> 

  See [States](/guide/Modeling/states.md) for more information.

### <span style="color:blue"> Events </span>
  Events monitor for specified criteria and can have one or more actions that are executed when that criteria is met. <br>

  See [Events](/guide/Modeling/events.md) for more information.

### <span style="color:orange"> Actions </span>
  Actions change the properties or cause movement though a model during a simulation run. <br>

  See [Actions](/guide/Modeling/actions.md) for more information.

### Arrows
  Arrows indicate movement from one state to another. Solid **black arrows** indicate that the state exits the current state and moves to the new state upon completion of the action. <span style="color:green">**Dotted green arrows**</span> indicate that the simulation will not exit the current state, but will add the new state as a "Current State" in the model. <br>

## Types of Diagrams
  The following diagram types are just a default corresponding to areas of traditional PRA modeling. Other types or labels can be used and will show in the navigation list. 
  The key difference in the types of diagrams is just if the diagram can only be in single state or multiple states concurrently and the ability to evaluate for a boolean value.

### Plant
  Plant or Plant Response diagrams are the main scenarios to be evaluated, similar to Event Trees in traditional PRS. 
  These diagrams are "Multiple State" capable meaning that you can be in multiple states at the same time.
  They typically have a starting state such as Normal Operation shown in this diagram. Other states can do general evaluation and movement or can be a key end state.  Here the user defines the various states and events that drive the simulation from an initiating event to a desired key state or ending of the simulation.
   
  ![SamplePlantDiagram](/images/Modeling/diagrams/SamplePlantDiagram.PNG)
  In this example we are looking for the key states of "Small_Release" and "Large_Release". (See Key Stats under [States](/guide/Modeling/states.md) for more information) The model starts in "Normal_Operations" and waits for a loss of offsite power "LOSP". When in "LOSP" three things can happen, ECS can fail, CCS and ECS can fail, or 24 hours can pass. These events cause the transition to the corresponding states and then the simulation will terminate.
 

### Component
  Component diagrams are meant to be small diagrams for capturing all the behavior of individual components. All the basic events for components in traditional PRA can be captured in a component diagram.
  These diagrams are "Single State" diagrams meaning you can only be in one state at a time and that a boolean value is associated with the different states. At least one state must have a "0" value and at least one state must have a "1" value assigned. (See [States](/guide/Modeling/states.md) for more information.) <br>
  ![SampleComponentDiagram](/images/Modeling/diagrams/SampleComponentDiagram.PNG)
  This example is a pump that has three states, standby, active and failed. When the demand event for the pumps use is triggered, the pump either moves to active or failed depending a random sampling. This would be equivalent to a "Fails to Start" basic event in traditional PRA.
  When in the active state, a failure rate event would sample and determine when the pump will fail and move to the failed state. This is equivalent to a "Fails to Run" basic event in traditional PRA.
  In this example, stop event resets or returns the pump to the standby state.

  *PRA Basic Events are captured as events in the component states.
  *Events can be shared between different components (common cause).
  *Component diagrams are required to be "Single State Diagrams" meaning the simulation can only be in one of those states at any given time.
  *Each State has a Boolean evaluation value, which can represent things like OK or Failed.

### System
  System diagrams are just a organizational label as they have the same features as a component diagram in that they are a "Single State Diagrams" and have a boolean evaluation.<br>
  
  To represent a system a diagram only needs two states, an active and failed. The work is done using a "Component Logic" event that evaluates a model of the components for the system.
  See [Logic Tree](/guide/Modeling/logicTree.md) for more information.
  ![SampleSystemDiagram](/images/Modeling/diagrams/SampleSystemDiagram.PNG)
  In this example the CCS system has two states, active and failed. The associated boolean logic tree is evaluated whenever a change is made and if the tree evaluates to a "0" then it moves to the failed state.

### Other
  If the type "Other" is chosen when creating a diagram then a general "Multiple State" capable, meaning that you can be in multiple states at the same time, is created.<br>


<!--Copyright 2021 Battelle Energy Alliance-->
# CODENAME ACRONYM
Event-Modeled Risk Assessment using Linked Diagrams (EMRALD) 

Event Modeling Risk Assessment using Linked Diagrams (EMRALD) is a software tool developed at INL for researching the capabilities of dynamic PRA (Probabilistic Risk Assessment). In order to promote the effective use of dynamic PRA by the general community, EMRALD focuses on the following key aspects: Simplifying the modeling process by providing a structure that corresponds to traditional PRA modeling methods Providing a user interface (UI) that makes it easy for the user to model and visualize complex interactions Allowing the user to couple with other analysis applications such as physics based simulations. This includes one-way communication for most applications and two-way loose coupling for customizable applications Providing the sequence and timing of events that lead to the specified outcomes when calculating results Traditional aspects of components with basic events, fault trees, and event trees are all captured in a dynamic framework of state diagrams, which are displayed

## SETUP
1. Clone this repository to your machine using `git clone https://github.com/inl-labtrack/EMRALD.git`
2. When the cloning is complete, open "EMRALD.sln" in Visual Studio
3. In Visual Studio's Solution Explorer, there will be several projects listed.  These are detailed in [EMRALD Projects](#emrald-projects) section below.  The three primary projects are the website used for building models, the desktop application used for running simulations, and the documentation project for getting started with EMRALD and learning how to use it.
	- To debug the Website project:
		1. Right-click on "Emrald_Site" in the Solution Explorer
		2. Select "View in Browser"
	- To debug the Simulator Project: 
		1. Right-click on "EMRALD_Sim" in the Solution Explorer
		2. Under "Debug," select "Start New Instance"
    - To run the Documentation Project:
        1. Download and install Node.js from [https://nodejs.org/en/](https://nodejs.org/en/) (This will also install npm)
        2. Once Node.js is installed, navigate to the "emrald-docs" directory (i.e. \EMRALD\emrald-docs) in a terminal window (such as Command Prompt)
        3. Run the commmand `npm install` to install the project's dependencies
        4. Start the local dev server by running the command `npm run dev`
        5. Once the server is running, this message should appear: `VuePress dev server listening at http://localhost:8080/`
        6. Navigate to [http://localhost:8080/](http://localhost:8080/) to view the EMRALD Documentation.



## EMRALD Projects
 - EMRALD_Sim
 - Emrald_Site
 - emrald-docs
 - MessageDefLib
 - SimulationDAL
 - SimulationEngine
 - Testing
 - XmppClient
 - XmppServerController


### Other Software
Idaho National Laboratory is a cutting edge research facility which is a constantly producing high quality research and software. Feel free to take a look at our other software and scientific offerings at:

[Primary Technology Offerings Page](https://www.inl.gov/inl-initiatives/technology-deployment)

[Supported Open Source Software](https://github.com/idaholab)

[Raw Experiment Open Source Software](https://github.com/IdahoLabResearch)

[Unsupported Open Source Software](https://github.com/IdahoLabCuttingBoard)

### License

Copyright 2021 Battelle Energy Alliance, LLC

Licensed under the MIT (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

  https://opensource.org/licenses/MIT

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.



Licensing
-----
This software is licensed under the terms you may find in the file named "LICENSE" in this directory.


Developers
-----
By contributing to this software project, you are agreeing to the following terms and conditions for your contributions:

You agree your contributions are submitted under the Apache-2 license. You represent you are authorized to make the contributions and grant the license. If your employer has rights to intellectual property that includes your contributions, you represent that you have received permission to make contributions and grant the required license on behalf of that employer.
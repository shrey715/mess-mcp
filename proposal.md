# OnlyApps

**Team:** Rohit Jeswanth, Shreyas Deb, Vishak Kashyap K, Garimella Sai Abhishek

---

## Overview

We propose to build an electron renderer for applets with a custom bus to facilitate inter process communication between different applets.

An applet is any application that can achieve something related to day to day activities in IIIT. This may be new applications, improvements of existing IIIT applications and automations. If anything takes too many clicks on existing IIIT sites there can be an applet for it. Some examples of applets that we will implement include:

---

## Proposed Applets

### LIHA (Lord I Hate Assignments)

Assignments on moodle are hard to track and keep up with especially when they stack up and you haven't seen the professors face since the last full moon. We propose an applet that monitors your moodle for new assignments and each time one comes up, it goes through your moodle notes and generates a roadmap of all the lectures you will have to read for the assignment, it also looks at the complexity and creates realistic timeframes for how long your assignment will take.

### Mess Mate

Knowing how usually pulling up to the mess alone just makes the already horrible food much worse, imagine how much easier it would be if you could stick with your friends the entire time even when you forgot to register for a month. Furthermore, everyday the Whatsapp group for Mess-Buy-Sell just gets flooded with a bunch of sell and buy orders. We aim to steamline all this in one Mess Assistant App (NOT AI) where it brings all the nitty-gritties that the vanilla mess.iiit.ac.in missed :)

### EVERBot

Every problem we face in our sad lives in this college at some point goes into spam group asking what the solution for this is, what is the syllabus of a certain course, what is the definition of an open elective, who should I complain if I havent received a certain research travel reimbursement, essentially every information that is present in the unorganized pile of documents on a 2005 styled website called intranet.iiit.ac.in, just have an mcp server which allows you to automate a lot of things upon the knowledge base of the documents.

### Calogg

A calendar aggregator which works with every other applet to automatically update your Google calendar with reminders for assignments, mess, lectures, holidays, events via the bus.

### Supplementary

Other applets may be built on top, such as Clubs Event Planner, RnD discussion portals, Exam Planners/Coaches, etc. These would just use the already existing applets, MCP servers, and the bus services provided in OnlyApps to render/generate information.

---

## Tech Stuff

To support some of these tools, we will be building 2 MCPs (Moodle and Intranet) which work with a wide of the applets to improve their grounding. These would provide grounding via the bus architecture, essentially creating a common database on top of which everything else runs.
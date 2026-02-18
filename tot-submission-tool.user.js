// ==UserScript==
// @name         Tot Batch Submission Tool
// @namespace    http://tampermonkey.net/
// @version      0.67
// @description  Some controls to assist with coding ToT
// @author       David Elmkies (delmkies)
// @match        fclm-portal.amazon.com/employee/*
// @require      https://v2.vuejs.org/js/vue.js

// @grant        none
// @run-at       document-end
// ==/UserScript==

//configure breaks (format: "01:00-01:30")
const break1 = "22:00-22:30";
const break2 = "02:00-02:30";
const break3 = "04:30-04:45";
const breaksEnabled = true;

window.globalThat = {};

function sublist(code, cb) {
        jediClient.getAllLaborFunctionsForLaborProcessId({
        ServiceName: 'FCLMJobEntryDomainInformationService',
        data: {
            laborProcessId: code
        },
        Method: 'GetAllLaborFunctionsForLaborProcessId',
        success: cb
    });
    //$.codigo({
    //    ServiceName: 'FCLMJobEntryDomainInformationService',
    //   data: {
    //        laborProcessId: code
    //    },
    //    Method: 'GetAllLaborFunctionsForLaborProcessId',
    //    success: cb
    //});
};

function submitTot(tots){
    var newProcess = window.vueInstance.selectedLaborProcess;
    var newFunction= window.vueInstance.selectedLaborFunction;

    var empId = document.getElementById("employeeId").value;
    var whId = document.getElementById("warehouseId").value;
    var startDate = document.getElementById("startDate").value;
    var startHour = document.getElementById("startHour").value;
    var startMinute = document.getElementById("startMinute").value;
    var endDate = document.getElementById("endDate").value;
    var endHour = document.getElementById("endHour").value;
    var endMinute = document.getElementById("endMinute").value;

    tots.forEach(function(tot){
        var enc = encodeURIComponent;

        var line = "startDate=" + enc(startDate) + "&startHour=" + enc(startHour) + "&startMinute=" + enc(startMinute) +
                   "&endDate=" + enc(endDate) + "&endHour=" + enc(endHour) + "&endMinute=" + enc(endMinute) +
                   "&employeeId=" + enc(empId) + "&warehouseId=" + enc(whId) + "&laborFuncStartTime=" + enc(tot[1]) + "&laborFuncEndTime=" + enc(tot[3]) +
                   "&newLaborProcessId=" + enc(newProcess) + "&newLaborFunctionId=" + enc(newFunction);

        if(window.location.pathname.includes("ppa")){
            line = line.replace("warehouseId","oldWarehouseId");
            var loc = line.search("&newLaborProcessId");
            line = line.slice(0,loc)+"&warehouseId="+enc(whId)+line.slice(loc);
            loc = line.search("&newLaborFunctionId");
            line = line.slice(0,loc) + "&newJobRole=" + newFunction.replaceAll(" ", "+");
        }

        $.ajax({
            url: $(this).attr('action'),
            type: 'POST',
            data: line,
            success: function(response){
                window.vueInstance.processResponse(response,tot[tot.length-1],newProcess,newFunction);
            }

        });
    });
};

function withinTimeSpan(query, spanStart, spanEnd){
    var q = query.split(":");
    var qHour = Number(q[0]);
    var qMin = Number(q[1]);

    for(var i = spanStart.getHours(); i <= spanEnd.getHours(); ){
        if( i == qHour){
            if( i == spanStart.getHours() && qMin < spanStart.getMinutes() ){
                return false;
            }
            if( i == spanEnd.getHours() && qMin > spanEnd.getMinutes()){
                return false;
            }
            return true;
        }
        if(i < 23) i++;
        else i = 0;
    }
    return false;
};


window.globalThat.sublist = sublist;
window.globalThat.submitTot = submitTot;


(function() {
    var editables = document.getElementsByClassName('editable');

    //added to fix issues at other warehouses due to example editables and punch editing
    var i;
    var editablesArray = [];
    for(i = 0; i < editables.length; i++){
        if(!editables[i].className.includes("example") &&
           editables[i].parentNode.hasAttribute("onclick") &&
           editables[i].parentNode.attributes.onclick.nodeValue.startsWith("firePopup")) {

            editablesArray.push(editables[i]);
        }
    }

    var parseFire = function(args)
    {
        return eval (args.replace('firePopup(', '[').replace (');', ']').replace('\t', '').replace('\n',''));
    };

    var totParams = editablesArray.map(ed => parseFire( ed.parentNode.attributes.onclick.nodeValue ));
    window.globalThat.totParams = totParams;

    var contentPanel = document.getElementById('content-panel');
    var root = document.createElement('div');
    root.id='root';
    contentPanel.append(root);

    window.vueInstance = new Vue({
        data: {
            totParams: totParams.map(params => params.concat( false)),
            processOptions: [...document.getElementById('newLaborProcessId')].map( (option) => { return {value: option.value, label: option.text}}),
            sublist: sublist,
            submitTot: submitTot,
            selectedLaborProcess: -1,
            functionOptions: [{laborFunctionId: -1, laborFunctionName: 'Choose Function'}],
            selectedLaborFunction: -1,
            message: "",
            message2: "",
            submittedlist: [],
            now: Date.now(),
            lastCodedProcess: "",
            lastCodedFunction: "",
            loadLastCoded: false,

        },
        watch: {
            selectedLaborProcess: () => {this.vueInstance.newSubList;},
            totParams: () => {this.vueInstance.updateTotalDuration;}
        },
        created:function(){
            var savedProcess = window.localStorage.getItem("totProcess");
            var savedFunction = window.localStorage.getItem("totFunction");
            if(savedProcess != null){
                this.selectedLaborProcess = savedProcess;
            }

            var total = 0;
            var title = document.getElementsByClassName("title")[0];
            this.totParams.forEach(bar => (total += this.getDuration(bar[1],bar[3])));
            title.innerText = title.innerText + "("+Math.round(total)+"m)";
        },
        computed: {
             newSubList(){
                if(window.location.pathname.includes("ppaTimeDetails")){
                    var selectedLabel = this.processOptions.filter(x => x.value == this.selectedLaborProcess)[0].label;
                    var funclist = processes[selectedLabel].attributes.job_role.sort();
                    this.functionOptions = [this.functionOptions[0]];
                    funclist.forEach(x => this.functionOptions.push({laborFunctionId: x,laborFunctionName: x}));
                    if(this.loadLastCoded){
                        this.selectedLaborFunction = this.functionOptions.find(obj => {return obj.laborFunctionName === this.lastCodedFunction}).laborFunctionId.toString();
                        this.loadLastCoded = false
                    }
                }
                else{
                    this.seekFunctions(false);
                    return sublist(this.selectedLaborProcess, (result) => {
                        this.functionOptions = result.laborFunctions.sort((a, b) => (a.laborFunctionName > b.laborFunctionName) ? 1 : -1 );
                        this.seekFunctions(true);
                    });
                }
            },
            updateTotalDuration(){
                var total = 0;
                this.totParams.filter(p=> p[p.length-1]==true).forEach(bar => (total += this.getDuration(bar[1],bar[3])));
                if(total>0){
                    this.message2 = (Math.round(total*10)/10).toString() + " minutes selected";
                }
                else this.message2 ="";
            },
        },
        methods: {

             fireTots() {
                //update select menu defaults
                window.localStorage.setItem("totProcess",this.selectedLaborProcess);
                window.localStorage.setItem("totFunction",this.selectedLaborFunction);

                var totSend = [];
                this.totParams.forEach(function(tot){
                    totSend.push([...tot]);
                });
                for(var i = 0; i < totSend.length; i++){
                    totSend[i].push(i);
                }

                if (this.selectedLaborProcess > 0 && (this.selectedLaborFunction.length == 0 || this.selectedLaborFunction > 0
                                                     ||(window.location.pathname.includes("ppa") && this.selectedLaborFunction.length > 0))) {
                    this.submitTot(totSend.filter(p=> p[p.length-2]==true));
                    this.message = "Submitting batch...";
                }else{
                    this.message = "Check process and function options before submitting!";
                }
             },
            loadLastCodedBar() {
                var lcp = "";
                var lcf = "";
                var foundEdited = false

                for(i = editablesArray.length-1; i >= 0; i--){
                    if(editablesArray[i].parentElement.parentElement.className == "function-seg edited"){
                        lcp = totParams[i][4];
                        lcf = totParams[i][5];
                        foundEdited = true;
                        break;
                    }
                }

                if(foundEdited){
                    this.lastCodedProcess = lcp;
                    this.lastCodedFunction = lcf;
                    var lastProcessCode = this.processOptions.find(obj => {return obj.label === lcp}).value;

                    if(lastProcessCode == this.selectedLaborProcess && this.functionOptions.some(f => {return f.laborFunctionName === lcf})){
                        this.selectedLaborFunction = this.functionOptions.find(obj => {return obj.laborFunctionName === lcf}).laborFunctionId.toString();
                    }
                    else{
                            this.loadLastCoded = true;
                            this.selectedLaborProcess = lastProcessCode;
                    }
                }
                else{
                    this.message2 = "No previously edited bar found to copy.";
                }
            },
            processResponse(response, totIndex, procId, funcId){
                this.message = "";
                //response = document.documentElement.outerHTML;

                //if the parameters for the bar are included, we assume it's a normal response.
                if(totParams[totIndex].every(x => response.includes(x))){
                    var proc = this.processOptions.filter(x => x.value == procId)[0].label;
                    var func = this.functionOptions.filter(x=> x.laborFunctionId == Number(funcId))[0].laborFunctionName;

                    this.totParams[totIndex][4] = proc;
                    this.totParams[totIndex][5] = func;
                    this.submittedlist.push(totIndex);
                    this.$forceUpdate();
                }
                else{


                    if(response.indexOf("<div class=\" error-message message\">")){
                        var errorString = response.split("<div class=\" error-message message\">")[1].split("</div>")[0].trim().split(" ").slice(1).join(" ");
                        if(errorString.startsWith("Function is for a direct or exempt job")) errorString = "Function is for a direct or exempt job";
                    }

                    this.message = "Response error.  Element: " + totIndex + ": " + errorString;
                    console.log(response);
                }
            },
            seekFunctions(isDone) {
                if(!isDone){
                    this.functionOptions =[{laborFunctionId: -1, laborFunctionName: '-= Getting New Functions =-'}]
                    this.message = "Getting Functions...";
                }else{
                    this.message = "";
                    this.message2 = "";

                    var savedFunction = null
                    if(!this.loadLastCoded){
                        if(this.selectedLaborProcess == window.localStorage.getItem("totProcess")){
                            savedFunction = window.localStorage.getItem("totFunction")
                        }
                    }
                    else{
                        savedFunction = this.functionOptions.find(obj => {return obj.laborFunctionName === this.lastCodedFunction}).laborFunctionId.toString();
                    }
                    if(savedFunction != null){
                        this.selectedLaborFunction = savedFunction;
                    }
                    this.loadLastCoded = false;

                }
            },
            getDuration(date1,date2) {
                date1 = new Date(date1);
                date2 = date2.length > 0 ? new Date(date2) : this.now;
                return Math.abs((date2 - date1)/60000);
            },
            breakIntersection(totStart,totEnd){
                if(!breaksEnabled){
                    return "";
                }

                var breaks = [break1.split('-'), break2.split('-'), break3.split('-')];
                totStart = new Date(totStart);
                totEnd = new Date(totEnd);
                var dayRollover = !(totStart.getDate() == totEnd.getDate() && totStart.getMonth() == totEnd.getMonth() && totStart.getYear == totEnd.getYear);
                var barrange = [[totStart.getHours(),totStart.getMinutes()],[totEnd.getHours(),totEnd.getMinutes()]];

                var rangeDuration = function (timerange){
                    let h = timerange[1][0] - timerange[0][0];
                    let m = timerange[1][1] - timerange[0][1];

                    return h*60 + m;
                }

                for( var b of breaks){
                    var breakrange = [ b[0].split(':').map(x => Number(x)), b[1].split(':').map(x => Number(x))];
                    var newIntersect;
                    if(!dayRollover){
                        var min = ( breakrange[0][0]<barrange[0][0] || (breakrange[0][0] == barrange[0][0] && breakrange[0][1] < barrange[0][1]) ? breakrange : barrange);
                        var max = (min == breakrange ? barrange : breakrange);


                        if(min[1][0] < max[0][0] || (min[1][0] == max[0][0] && min[1][1] < max[0][1])){
                             newIntersect = null;
                        }
                        else{
                            newIntersect = [[max[0][0],max[0][1]],(min[1][0] < max[1][0] || (min[1][0] == max[1][0] && min[1][1] < max[1][1])) ? min[1] : max[1]];
                        }
                        if(newIntersect){
                            //within 5 minutes of break time
                            if( rangeDuration(newIntersect) >= (rangeDuration(breakrange) - 5)){
                                return "Break" + b[0];
                            }
                        }
                    }
                }
            },
            allTotDuration(){
                var total = 0;
                this.totParams.forEach(bar => (total += this.getDuration(bar[1],bar[3])));
                if(total>0){
                    return " " + (Math.round(total*10)/10).toString() + "m in " + this.totParams.length + " bars:";
                }
                else return " No editable time.";
            },
            selectAllBars(){
                var checkboxes = document.querySelectorAll('input[type="checkbox"]')
                checkboxes.forEach(cb => {if(cb.checked == false) cb.click();});
            },
        },
        template:
            `<div>
            <h3>Hi!{{allTotDuration()}}</h3>

            <table align="center">
            <tbody>
            <tr v-for="(tot, totRow) in totParams">
            <td v-for="(attr, index) of tot">
            <template v-if="index==6">
            <input type="checkbox" v-model="totParams[totRow][index]">
            </template>
            <template v-else-if="index==0 || index==2">
            {{tot[index].length > 0 ? tot[index].substring(0,5) + tot[index].substring(10,16) : "(current)"}}
            </template>
            <template v-else-if="index==1">
            {{breakIntersection(tot[1],tot[3])}}
            </template>
            <template v-else-if="index==3">
            {{Math.round(getDuration(tot[1],tot[3])).toString()+"m"}}
            </template>
            <template v-else-if="submittedlist.includes(totRow)" color="green">
            {{ attr }}
            </template>
            <template v-else>
            {{ attr }}
            </template>
            </td>
            </tr>
            </tbody>
            </table>

            <div>
            <select v-model="selectedLaborProcess">
            <option v-for="process in processOptions" v-bind:value="process.value">
            {{process.label}}
            </option>
            </select>

            <select v-model="selectedLaborFunction">
            <option v-for="func in functionOptions" v-bind:value="func.laborFunctionId">
            {{func.laborFunctionName}}
            </option>
            </select>
            </div>
            <button @click="selectAllBars()">Select All</button>
            <button @click="loadLastCodedBar()">Prev. Task</button>
            <button @click="fireTots()">Submit</button>
            <div>
            {{message}}
            </div>
            <div>
            {{message2}}
            </div>
            </div>

            `,
    }).$mount(root);
    //console.log(totParams);
})();
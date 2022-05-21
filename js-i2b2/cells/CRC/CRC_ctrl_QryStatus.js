/**
 * @projectDescription	The Asynchronous Query Status controller (GUI-only controller).
 * @inherits 	i2b2.CRC.ctrlr
 * @namespace	i2b2.CRC.ctrlr.QueryStatus
 * @author		Marc-Danie Nazaire
 * @version 	2.0
 * ----------------------------------------------------------------------------------------
 */
i2b2.CRC.ctrlr.QueryStatus = {
    dispDIV: $("<div></div>")[0],
    isRunning: false,
    startTime: false,
    refreshInterrupt: false,
    polling_interval: 1000,

    refreshStatus: function () {
        $(i2b2.CRC.view.QS.containerDiv).empty();
        $(i2b2.CRC.ctrlr.QueryStatus.dispDIV).empty();
        $(i2b2.CRC.ctrlr.QueryStatus.dispDIV).appendTo(i2b2.CRC.view.QS.containerDiv);

        let sCompiledResultsTest = "";  // snm0 - this is the text for the graph display
        // callback processor to check the Query Instance
        let scopedCallbackQRSI = new i2b2_scopedCallback();
        scopedCallbackQRSI.scope = i2b2.CRC.ctrlr.QueryStatus; //self;
        // This is where each breakdown in the results is obtained
        // each breakdown comes through here separately
        scopedCallbackQRSI.callback = function (results) {
            if (results.error) {
                alert(results.errorMsg);
                return;
            } else {
                // find our query instance

                let ri_list = results.refXML.getElementsByTagName('query_result_instance');
                let l = ri_list.length;
                let description = "";  // Query Report BG
                for (let i = 0; i < l; i++) {
                    let temp = ri_list[i];
                    // get the query name for display in the box
                    description = i2b2.h.XPath(temp, 'descendant-or-self::description')[0].firstChild.nodeValue;
                    i2b2.CRC.ctrlr.QueryStatus.dispDIV.innerHTML += "<div class=\"mainGrp\" style=\"clear: both;  padding-top: 10px; font-weight: bold;\">" + description + "</div>";					// Query Report BG
                    sCompiledResultsTest += description + '\n';  //snm0
                }

                let crc_xml = results.refXML.getElementsByTagName('crc_xml_result');
                l = crc_xml.length;
                for (let i = 0; i < l; i++) {
                    let temp = crc_xml[i];
                    let xml_value = i2b2.h.XPath(temp, 'descendant-or-self::xml_value')[0].firstChild.nodeValue;

                    let xml_v = i2b2.h.parseXml(xml_value);

                    let params = i2b2.h.XPath(xml_v, 'descendant::data[@column]/text()/..');
                    for (let i2 = 0; i2 < params.length; i2++) {
                        let name = params[i2].getAttribute("name");
                        let value = params[i2].firstChild.nodeValue;

                        if (i2b2.PM.model.isObfuscated) {
                            if (params[i2].firstChild.nodeValue < 4) {
                                value = "<" + i2b2.UI.cfg.obfuscatedDisplayNumber.toString();
                            } else {
                                value = params[i2].firstChild.nodeValue + "&plusmn;" + i2b2.UI.cfg.obfuscatedDisplayNumber.toString();
                            }
                        }
                        if (i2b2.UI.cfg.useFloorThreshold) {
                            if (params[i2].firstChild.nodeValue < i2b2.UI.cfg.floorThresholdNumber) {
                                value = i2b2.UI.cfg.floorThresholdText + i2b2.UI.cfg.floorThresholdNumber.toString();
                            }
                        }
                        // N.Benik - Override the display value if specified by server setting the "display" attribute
                        let displayValue = value;
                        if (typeof params[i2].attributes.display !== 'undefined') {
                            displayValue = params[i2].attributes.display.textContent;
                        }
                        let graphValue = displayValue;
                        if (typeof params[i2].attributes.comment !== 'undefined') {
                            displayValue += ' &nbsp; <span style="color:#090;">[' + params[i2].attributes.comment.textContent + ']<span>';
                            graphValue += '|' + params[i2].attributes.comment.textContent;
                        }

                        // display a line of results in the status box
                        i2b2.CRC.ctrlr.QueryStatus.dispDIV.innerHTML += "<div class=\'" + description + "\' style=\"clear: both; margin-left: 20px; float: left; height: 16px; line-height: 16px;\">" + params[i2].getAttribute("column") + ": <font color=\"#0000dd\">" + displayValue + "</font></div>";  //Query Report BG

                        if (params[i2].getAttribute("column") === 'patient_count') {
                            sCompiledResultsTest += params[i2].getAttribute("column").substring(0, 20) + " : " + graphValue + "\n"; //snm0
                        } else {
                            sCompiledResultsTest += params[i2].getAttribute("column").substring(0, 20) + " : " + value + "\n"; //snm0
                        }
                    }
                }
                //alert(sCompiledResultsTest); //snm0
                /*i2b2.CRC.view.graphs.createGraphs("infoQueryStatusChart", sCompiledResultsTest, i2b2.CRC.view.graphs.bIsSHRINE);
                if (i2b2.CRC.view.graphs.bisGTIE8) {
                    // Resize the query status box depending on whether breakdowns are included
                    if (sCompiledResultsTest.includes("breakdown"))
                        i2b2.CRC.cfg.config.ui.statusBox = i2b2.CRC.cfg.config.ui.largeStatusBox;
                    else i2b2.CRC.cfg.config.ui.statusBox = i2b2.CRC.cfg.config.ui.defaultStatusBox;
                    i2b2.CRC.view.status.selectTab('graphs');
                    //$(window).trigger('resize');
                    window.dispatchEvent(new Event('resize'));
                }*/
                //self.dispDIV.innerHTML += this.dispMsg;
            }
        }

        // this private function refreshes the display DIV
        let d = new Date();
        t = Math.floor((d.getTime() - i2b2.CRC.ctrlr.QueryStatus.startTime) / 100) / 10;
        let s = t.toString();
        if (s.indexOf('.') < 0) {
            s += '.0';
        }
        if (i2b2.CRC.ctrlr.QueryStatus.isRunning) {
            i2b2.CRC.ctrlr.QueryStatus.dispDIV.innerHTML = '<div style="clear:both;"><div style="float:left; font-weight:bold">Running Query: "' + i2b2.CRC.ctrlr.QueryStatus.QM.name + '"</div>';
            // display the current run duration

            i2b2.CRC.ctrlr.QueryStatus.dispDIV.innerHTML += '<div style="float:right">[' + s + ' secs]</div>';
        } else {
            i2b2.CRC.ctrlr.QueryStatus.dispDIV.innerHTML = '<div style="clear:both;"><div style="float:left; font-weight:bold">Finished Query: "' + i2b2.CRC.ctrlr.QueryStatus.QM.name + '"</div>';
            i2b2.CRC.ctrlr.QueryStatus.dispDIV.innerHTML += '<div style="float:right">[' + s + ' secs]</div>';

            //Query Report BG
            /*if((!Object.isUndefined(self.QI.start_date)) && (!Object.isUndefined(self.QI.end_date)))
            {
                var startDateElem = "<input type=\"hidden\" id=\"startDateElem\" value=\"" + self.QI.start_date + "\">";
                var startDateMillsecElem = "<input type=\"hidden\" id=\"startDateMillsecElem\" value=\"" + moment(self.QI.start_date) + "\">";
                var endDateElem = "<input type=\"hidden\" id=\"endDateElem\" value=\"" + self.QI.end_date + "\">";
                var endDateMillisecElem = "<input type=\"hidden\" id=\"endDateMillsecElem\" value=\"" + moment(self.QI.end_date) + "\">";
                self.dispDIV.innerHTML += startDateElem + startDateMillsecElem + endDateElem + endDateMillisecElem;
            }
            //End Query Report BG
            //		self.dispDIV.innerHTML += '<div style="margin-left:20px; clear:both; height:16px; line-height:16px; "><div height:16px; line-height:16px; ">Compute Time: ' + (Math.floor((self.QI.end_date - self.QI.start_date)/100))/10 + ' secs</div></div>';
            //		self.dispDIV.innerHTML += '</div>';
            $('runBoxText').innerHTML = "Run Query";
            */
        }
        i2b2.CRC.ctrlr.QueryStatus.dispDIV.innerHTML += '</div>';
        if ((!i2b2.CRC.ctrlr.QueryStatus.isRunning) && (undefined !== i2b2.CRC.ctrlr.QueryStatus.QI.end_date)) {
            i2b2.CRC.ctrlr.QueryStatus.dispDIV.innerHTML += '<div style="margin-left:20px; clear:both; line-height:16px; ">Compute Time: ' + (Math.floor((i2b2.CRC.ctrlr.QueryStatus.QI.end_date - i2b2.CRC.ctrlr.QueryStatus.QI.start_date) / 100)) / 10 + ' secs</div>';
        }

        let foundError = false;

        for (let i in i2b2.CRC.ctrlr.QueryStatus.QRS) {
            let rec = i2b2.CRC.ctrlr.QueryStatus.QRS[i];
            if (rec.QRS_time) {
                let t = '<font color="';
                // display status of query in box
                switch (rec.QRS_Status) {
                    case "ERROR":
                        i2b2.CRC.ctrlr.QueryStatus.dispDIV.innerHTML += '<div style="clear:both; height:16px; line-height:16px; "><div style="float:left; font-weight:bold; height:16px; line-height:16px; ">' + rec.title + '</div><div style="float:right; height:16px; line-height:16px; "><font color="#dd0000">ERROR</font></div>';
                        foundError = true;
                        break;
                    case "COMPLETED":
                    case "FINISHED":
                        foundError = false;
                        break;
                    case "INCOMPLETE":
                    case "WAITTOPROCESS":
                    case "PROCESSING":
                        i2b2.CRC.ctrlr.QueryStatus.dispDIV.innerHTML += '<div style="clear:both; height:16px;line-height:16px; "><div style="float:left; font-weight:bold;  height:16px; line-height:16px; ">' + rec.title + '</div><div style="float:right; height:16px; line-height:16px; "><font color="#00dd00">PROCESSING</font></div>';
                        //				self.dispDIV.innerHTML += '<div style="float:right; height:16px; line-height:16px; "><font color="#00dd00">PROCESSING</font></div>'; //['+rec.QRS_time+' secs]</div>';
                        alert('Your query has timed out and has been rescheduled to run in the background.  The results will appear in "Previous Queries"');
                        foundError = true;

                        //t += '#00dd00">'+rec.QRS_Status;
                        break;
                }
                t += '</font> ';
            }
            i2b2.CRC.ctrlr.QueryStatus.dispDIV.innerHTML += '</div>';
            if (foundError === false) {
                if (rec.QRS_DisplayType === "CATNUM") {
                    i2b2.CRC.ajax.getQueryResultInstanceList_fromQueryResultInstanceId("CRC:QueryStatus", {qr_key_value: rec.QRS_ID}, scopedCallbackQRSI);
                } else if ((rec.QRS_DisplayType === "LIST") && (foundError === false)) {
                    i2b2.CRC.ctrlr.QueryStatus.dispDIV.innerHTML += "<div style=\"clear: both; padding-top: 10px; font-weight: bold;\">" + rec.QRS_Description + "</div>";
                }
            }
        }
        if ((undefined !== i2b2.CRC.ctrlr.QueryStatus.QI.message) && (foundError === false)) {
            i2b2.CRC.ctrlr.QueryStatus.dispDIV.innerHTML += '<div style="clear:both; float:left;  padding-top: 10px; font-weight:bold">Status</div>';


            let mySplitResult = i2b2.CRC.ctrlr.QueryStatus.QI.message.split("<?xml");

            for (let i3 = 1; i3 < mySplitResult.length; i3++) {

                let xml_v = i2b2.h.parseXml(trim("<?xml " + mySplitResult[i3]));

                for (let i2 = 0; i2 < xml_v.childNodes.length; i2++) {
                    try {
                        let value = i2b2.h.XPath(xml_v, 'descendant::total_time_second/text()/..')[i2].firstChild.nodeValue;

                        if (i2b2.PM.model.isObfuscated) {
                            if (i2b2.h.XPath(xml_v, 'descendant::total_time_second/text()/..')[i2].firstChild.nodeValue < 4) {
                                value = "<" + i2b2.UI.cfg.obfuscatedDisplayNumber.toString();
                            } else {
                                value = i2b2.h.XPath(xml_v, 'descendant::total_time_second/text()/..')[i2].firstChild.nodeValue + "&plusmn;" + i2b2.UI.cfg.obfuscatedDisplayNumber.toString();
                            }
                        }

                        if (i2b2.UI.cfg.useFloorThreshold) {
                            if (i2b2.h.XPath(xml_v, 'descendant::total_time_second/text()/..')[i2].firstChild.nodeValue < i2b2.UI.cfg.floorThresholdNumber) {
                                value = i2b2.UI.cfg.floorThresholdText + i2b2.UI.cfg.floorThresholdNumber.toString();
                            }
                        }
                        i2b2.CRC.ctrlr.QueryStatus.dispDIV.innerHTML += '<div style="margin-left:20px; clear:both; line-height:16px; ">' + i2b2.h.XPath(xml_v, 'descendant::name/text()/..')[i2].firstChild.nodeValue + '<font color="#0000dd">: ' + value + ' secs</font></div>';
                    } catch (e) {}
                }
            }
        }

        i2b2.CRC.ctrlr.QueryStatus.dispDIV.style.display = 'none';
        i2b2.CRC.ctrlr.QueryStatus.dispDIV.style.display = 'block';

        if (!i2b2.CRC.ctrlr.QueryStatus.isRunning && i2b2.CRC.ctrlr.QueryStatus.refreshInterrupt) {
            // make sure our refresh interrupt is turned off
            try {
                clearInterval(i2b2.CRC.ctrlr.QueryStatus.refreshInterrupt);
                i2b2.CRC.ctrlr.QueryStatus.refreshInterrupt = false;
            } catch (e) {
            }
        }
    },

    pollStatus: function () {
        // this is a private function that is used by all QueryStatus object instances to check their status
        // callback processor to check the Query Instance
        let scopedCallbackQI = new i2b2_scopedCallback();
        scopedCallbackQI.scope = i2b2.CRC.ctrlr.QueryStatus;
        scopedCallbackQI.callback = function (results) {
            if (results.error) {
                alert(results.errorMsg);
                return;
            } else {
                // find our query instance
                let qi_list = results.refXML.getElementsByTagName('query_instance');
                let l = qi_list.length;
                for (let i = 0; i < l; i++) {
                    let temp = qi_list[i];
                    let qi_id = i2b2.h.XPath(temp, 'descendant-or-self::query_instance_id')[0].firstChild.nodeValue;

                    this.QI.message = i2b2.h.getXNodeVal(temp, 'message');
                    this.QI.start_date = i2b2.h.getXNodeVal(temp, 'start_date');
                    if (this.QI.start_date !== undefined) {
                        //012345678901234567890123
                        //2010-12-21T16:12:01.427
                        this.QI.start_date =  new Date(this.QI.start_date.substring(0,4), this.QI.start_date.substring(5,7)-1, this.QI.start_date.substring(8,10), this.QI.start_date.substring(11,13),this.QI.start_date.substring(14,16),this.QI.start_date.substring(17,19),this.QI.start_date.substring(20,23));
                    }
                    this.QI.end_date = i2b2.h.getXNodeVal(temp, 'end_date');
                    if (this.QI.end_date !== undefined) {
                        this.QI.end_date =  new Date(this.QI.end_date.substring(0,4), this.QI.end_date.substring(5,7)-1, this.QI.end_date.substring(8,10), this.QI.end_date.substring(11,13),this.QI.end_date.substring(14,16),this.QI.end_date.substring(17,19),this.QI.end_date.substring(20,23));
                    }

                    if (qi_id === this.QI.id) {
                        // found the query instance, extract the info
                        this.QI.status = i2b2.h.XPath(temp, 'descendant-or-self::query_status_type/name')[0].firstChild.nodeValue;
                        this.QI.statusID = i2b2.h.XPath(temp, 'descendant-or-self::query_status_type/status_type_id')[0].firstChild.nodeValue;
                        i2b2.CRC.ctrlr.QueryStatus.isRunning = false;

                        i2b2.CRC.ajax.getQueryResultInstanceList_fromQueryInstanceId("CRC:QueryStatus", {qi_key_value: i2b2.CRC.ctrlr.QueryStatus.QI.id}, scopedCallbackQRS);
                        break;
                    }
                }
            }
        }

        // callback processor to check the Query Result Set
        let scopedCallbackQRS = new i2b2_scopedCallback();
        scopedCallbackQRS.scope = i2b2.CRC.ctrlr.QueryStatus;
        scopedCallbackQRS.callback = function (results) {
            if (results.error) {
                alert(results.errorMsg);
                return;
            } else {
                // find our query instance
                let qrs_list = results.refXML.getElementsByTagName('query_result_instance');
                let l = qrs_list.length;
                for (let i = 0; i < l; i++) {
                    let rec = new Object();
                    let temp = qrs_list[i];
                    let qrs_id = i2b2.h.XPath(temp, 'descendant-or-self::result_instance_id')[0].firstChild.nodeValue;
                    if (i2b2.CRC.ctrlr.QueryStatus.QRS.hasOwnProperty(qrs_id)) {
                        rec = i2b2.CRC.ctrlr.QueryStatus.QRS[qrs_id];
                    } else {
                        rec.QRS_ID = qrs_id;
                        rec.size = i2b2.h.getXNodeVal(temp, 'set_size');
                        rec.start_date = i2b2.h.getXNodeVal(temp, 'start_date');
                         if (rec.start_date !== undefined) {
                             //alert(sDate.substring(0,4) + ":" + sDate.substring(5,7)  + ":" + sDate.substring(8,10));
                             //012345678901234567890123
                             //2010-12-21T16:12:01.427
                             rec.start_date =  new Date(rec.start_date.substring(0,4), rec.start_date.substring(5,7)-1, rec.start_date.substring(8,10), rec.start_date.substring(11,13),rec.start_date.substring(14,16),rec.start_date.substring(17,19),rec.start_date.substring(20,23));
                         }
                        rec.end_date = i2b2.h.getXNodeVal(temp, 'end_date');
                        if (rec.end_date !== undefined) {
                            //alert(sDate.substring(0,4) + ":" + sDate.substring(5,7)  + ":" + sDate.substring(8,10));
                            rec.end_date =  new Date(rec.end_date.substring(0,4), rec.end_date.substring(5,7)-1, rec.end_date.substring(8,10), rec.end_date.substring(11,13),rec.end_date.substring(14,16),rec.end_date.substring(17,19),rec.end_date.substring(20,23));
                        }

                        rec.QRS_DisplayType = i2b2.h.XPath(temp, 'descendant-or-self::query_result_type/display_type')[0].firstChild.nodeValue;
                        rec.QRS_Type = i2b2.h.XPath(temp, 'descendant-or-self::query_result_type/name')[0].firstChild.nodeValue;
                        rec.QRS_Description = i2b2.h.XPath(temp, 'descendant-or-self::description')[0].firstChild.nodeValue;
                        rec.QRS_TypeID = i2b2.h.XPath(temp, 'descendant-or-self::query_result_type/result_type_id')[0].firstChild.nodeValue;
                    }
                    rec.QRS_Status = i2b2.h.XPath(temp, 'descendant-or-self::query_status_type/name')[0].firstChild.nodeValue;
                    rec.QRS_Status_ID = i2b2.h.XPath(temp, 'descendant-or-self::query_status_type/status_type_id')[0].firstChild.nodeValue;
                    // create execution time string
                    let d = new Date();
                    let t = Math.floor((d.getTime() - i2b2.CRC.ctrlr.QueryStatus.startTime) / 100) / 10;
                    let exetime = t.toString();
                    if (exetime.indexOf('.') < 0) {
                        exetime += '.0';
                    }
                    // deal with time/status setting
                    if (!rec.QRS_time) {
                        rec.QRS_time = exetime;
                    }

                    // set the proper title if it was not already set
                    if (!rec.title) {
                        rec.title = i2b2.CRC.ctrlr.QueryStatus._GetTitle(rec.QRS_Type, rec, temp);
                    }
                    i2b2.CRC.ctrlr.QueryStatus.QRS[qrs_id] = rec;
                }
                i2b2.CRC.ctrlr.history.Refresh();
            }
            // force a redraw
            i2b2.CRC.ctrlr.QueryStatus.refreshStatus();
        }

        i2b2.CRC.ajax.getQueryInstanceList_fromQueryMasterId("CRC:QueryStatus", {qm_key_value: i2b2.CRC.ctrlr.QueryStatus.QM.id}, scopedCallbackQI);
    }
};

i2b2.CRC.ctrlr.QueryStatus.updateStatus = function(results) {
    let temp = results.refXML.getElementsByTagName('query_master')[0];
    i2b2.CRC.ctrlr.QueryStatus.QRS = {};
    i2b2.CRC.ctrlr.QueryStatus.QI = {};
    i2b2.CRC.ctrlr.QueryStatus.QM = {};
    i2b2.CRC.ctrlr.QueryStatus.QM.id = i2b2.h.getXNodeVal(temp, 'query_master_id');
    i2b2.CRC.ctrlr.QueryStatus.QM.name = i2b2.h.XPath(temp, 'descendant-or-self::name')[0].firstChild.nodeValue;

    // save the query instance
    temp = results.refXML.getElementsByTagName('query_instance')[0];
    i2b2.CRC.ctrlr.QueryStatus.QI.id = i2b2.h.XPath(temp, 'descendant-or-self::query_instance_id')[0].firstChild.nodeValue;
    i2b2.CRC.ctrlr.QueryStatus.QI.start_date = i2b2.h.XPath(temp, 'descendant-or-self::start_date')[0].firstChild.nodeValue; //Query Report BG
    temp = i2b2.h.XPath(temp, 'descendant-or-self::end_date')[0];
    if (undefined !== temp) {
        i2b2.CRC.ctrlr.QueryStatus.QI.end_date = i2b2.h.XPath(temp, 'descendant-or-self::end_date')[0].firstChild.nodeValue; //Query Report BG
    }

    temp = results.refXML.getElementsByTagName('query_instance')[0];
    i2b2.CRC.ctrlr.QueryStatus.QI.status = i2b2.h.XPath(temp, 'descendant-or-self::query_status_type/name')[0];
    if (undefined !== i2b2.CRC.ctrlr.QueryStatus.QI.status ) {
        i2b2.CRC.ctrlr.QueryStatus.QI.status = i2b2.h.XPath(temp, 'descendant-or-self::query_status_type/name')[0].firstChild.nodeValue;
    }

    i2b2.CRC.ctrlr.QueryStatus.QI.statusID = i2b2.h.XPath(temp, 'descendant-or-self::query_status_type/status_type_id')[0];
    if (undefined !== i2b2.CRC.ctrlr.QueryStatus.QI.statusID) {
        i2b2.CRC.ctrlr.QueryStatus.QI.statusID = i2b2.h.XPath(temp, 'descendant-or-self::query_status_type/status_type_id')[0].firstChild.nodeValue;
    }

    setTimeout("i2b2.CRC.ctrlr.QueryStatus.pollStatus()", i2b2.CRC.ctrlr.QueryStatus.polling_interval);
};

i2b2.CRC.ctrlr.QueryStatus._GetTitle = function(resultType, oRecord, oXML) {
    let title = "";
    switch (resultType) {
        case "PATIENT_ENCOUNTER_SET":
            // use given title if it exist otherwise generate a title
            let t = null;
            try {
                t = i2b2.h.XPath(oXML,'self::query_result_instance/description')[0].firstChild.nodeValue;
            } catch(e) {}
            if (!t) { t = "Encounter Set"; }
            // create the title using shrine setting
            if (oRecord.size >= 10) {
                if (i2b2.PM.model.isObfuscated) {
                    title = t+" - "+oRecord.size+"&plusmn;"+i2b2.UI.cfg.obfuscatedDisplayNumber.toString()+" encounters";
                } else {
                    title = t; //+" - "+oRecord.size+" encounters";
                }
            } else {
                if (i2b2.PM.model.isObfuscated) {
                    title = t+" - 10 encounters or less";
                } else {
                    title = t; //+" - "+oRecord.size+" encounters";
                }
            }
            break;
        case "PATIENTSET":
            // use given title if it exist otherwise generate a title
            let p = null;
            try {
                p = i2b2.h.XPath(oXML,'self::query_result_instance/description')[0].firstChild.nodeValue;
            } catch(e) {}
            if (!p) { p = "Patient Set"; }
            // create the title using shrine setting
            if (oRecord.size >= 10) {
                if (i2b2.PM.model.isObfuscated) {
                    title = p+" - "+oRecord.size+"&plusmn;"+i2b2.UI.cfg.obfuscatedDisplayNumber.toString()+" patients";
                } else {
                    title = p; //+" - "+oRecord.size+" patients";
                }
            } else {
                if (i2b2.PM.model.isObfuscated) {
                    title = p+" - 10 patients or less";
                } else {
                    title = p; //+" - "+oRecord.size+" patients";
                }
            }
            break;
        case "PATIENT_COUNT_XML":
            // use given title if it exist otherwise generate a title
            let x = null;
            try {
                x = i2b2.h.XPath(oXML,'self::query_result_instance/description')[0].firstChild.nodeValue;
            } catch(e) {
            }
            if (!x) { x="Patient Count"; }
            // create the title using shrine setting
            if (oRecord.size >= 10) {
                if (i2b2.PM.model.isObfuscated) {
                    title = x+" - "+oRecord.size+"&plusmn;"+i2b2.UI.cfg.obfuscatedDisplayNumber.toString()+" patients";
                } else {
                    title = x+" - "+oRecord.size+" patients";
                }
            } else {
                if (i2b2.PM.model.isObfuscated) {
                    title = x+" - 10 patients or less";
                } else {
                    title = x+" - "+oRecord.size+" patients";
                }
            }
            break;
        default :
            try {
                title = i2b2.h.XPath(oXML,'self::query_result_instance/query_result_type/description')[0].firstChild.nodeValue;
            } catch(e) {
            }
            break;
    }

    return title;
};

function trim(sString)
{
    while (sString.substring(0,1) === '\n')
    {
        sString = sString.substring(1, sString.length);
    }
    while (sString.substring(sString.length-1, sString.length) === '\n')
    {
        sString = sString.substring(0,sString.length-1);
    }
    return sString;
}
const index = "news";

const topic_classes = [
    "Autos",
    "Business_and_finance",
    "Entertainment_and_lifestyle",
    "Religion",
    "Politics",
    "Science",
    "Sports",
    "Technology",
    "Other_content"
];

var hit_results = [];

// Called when the user clicks on a doc.
function register_click(hit_index) {
    const hit = hit_results[hit_index];
    show_doc(hit);
    update_clicks_for_document();
    update_topic_preferences(hit["_source"]["category_probs"]);
}

function show_doc(hit) {
    // TODO
    text = "<div class='hitbox'>";
    text += "<h3 class='headline'>" + hit["_source"]["title"] + "</h3>";
    text += "<div class='subtitle'>";
    text += "<p class='source'><a href="+hit["_source"]["source"]+">" + get_source_from_url(hit["_source"]["source"]) + "</a></p>";
    text += "<p class='date'>" + unix_time_to_date(hit["_source"]["timestamp"]) + "</p>";
    text += "</div>"
    text += "<p class='content'>" + hit["_source"]["text"] + "</p>";
    text += '<input type="button" class="continue_btn" value="Back to suggested news..." onclick="show_results()"/>';
    text += "</div>";
    document.getElementById("results").innerHTML = text;
}

function update_clicks_for_document() {
    // TODO
    // Update the counter.
}

function update_topic_preferences(document_topic_distribution) {
    // TODO
    // Probably incomplete and incorrect.
    var usr_topic_pref = get_usr_topic_pref();

    const alpha = 0;
    for (let i = 0; i < usr_topic_pref.length; i++) {
        usr_topic_pref[i] =
            usr_topic_pref[i] * alpha +
            document_topic_distribution[i] * (1 - alpha);
    }

    window.localStorage.setItem(
        "topic_preferences",
        JSON.stringify(usr_topic_pref)
    );
}

function suggest_news() {
    // Sorting function
    let query = get_suggested_news_query();

    $.ajax({
        method: "POST",
        dataType: "json",
        contentType: "application/json",
        url:
            "https://cors-anywhere.herokuapp.com/http://35.195.228.54:9200/" +
            index +
            "/_search",
        data: JSON.stringify(query)
    })
        .done(res => {
            hit_results = res["hits"]["hits"];
            show_results();
        })
        .fail(function (data) {
            console.log(data);
        });
}

function search() {
    // TODO: Rank this according to tf-idf and popularity.
    const Http = new XMLHttpRequest();
    const url =
        "https://cors-anywhere.herokuapp.com/http://35.195.228.54:9200/" +
        index +
        "/_search?q=" +
        document.getElementById("search_input").value;

    Http.open("GET", url);
    Http.send();

    document.getElementById("results").innerHTML = "Loading...";

    Http.onreadystatechange = e => {
        hit_results = JSON.parse(Http.responseText)["hits"]["hits"];
        show_results();
    };
}

function get_usr_topic_pref() {
    var usr_topic_pref = window.localStorage.getItem("topic_preferences");
    if (usr_topic_pref === null) {
        return Array(9).fill(1.0 / 9.0);
    } else {
        return JSON.parse(usr_topic_pref);
    }
}

function get_suggested_news_query() {

    var usr_topic_pref = get_usr_topic_pref();
    console.log(usr_topic_pref)
    var usr_euc_len = Math.sqrt(
        usr_topic_pref.reduce((acc, e) => {
            return acc + e * e;
        })
    );
    // TODO: Include clicks as well
    return {
        query: {
            function_score: {
                functions: [
                    // {
                    //     gauss: {
                    //         timestamp: {
                    //             origin: "now",
                    //             scale: "1d",
                    //             decay: "0.5"
                    //         }
                    //     } //,
                    //     //weight: 1
                    // },
                    {
                        script_score: {
                            script: {
                                lang: "painless",
                                params: { usr_topic_pref, usr_euc_len },
                                source:
                                    "double cos_sim = 0; \
                        double category_euc_len = 0; \
                        for (int i = 0; i < params.usr_topic_pref.length && i < doc['category_probs'].length; i++) { \
                            cos_sim += params['_source']['category_probs'][i] * params.usr_topic_pref[i];\
                            category_euc_len += doc['category_probs'][i] * doc['category_probs'][i]; \
                        } \
                        return cos_sim / (params.usr_euc_len * Math.sqrt(category_euc_len)); \
                        "
                        //                         cos_sim += doc['category_probs'][0] * " + usr_topic_pref[0] + "+doc['category_probs'][1] * " + usr_topic_pref[1] + "+doc['category_probs'][2] * " + usr_topic_pref[2] + "+doc['category_probs'][2] * " + usr_topic_pref[3] + "+doc['category_probs'][3] * " + usr_topic_pref[4] + "+doc['category_probs'][4] * " + usr_topic_pref[5] + "+doc['category_probs'][5] * " + usr_topic_pref[6] + "+doc['category_probs'][7] * " + usr_topic_pref[7] + "+doc['category_probs'][8] * " + usr_topic_pref[8] + ";\
                        //                         String debug = \"\" + doc['category_probs'][0] + " + usr_topic_pref[0] + "+doc['category_probs'][1] + " + usr_topic_pref[1] + "+doc['category_probs'][2] + " + usr_topic_pref[2] + "+doc['category_probs'][2] + " + usr_topic_pref[3] + "+doc['category_probs'][3] + " + usr_topic_pref[4] + "+doc['category_probs'][4] + " + usr_topic_pref[5] + "+doc['category_probs'][5] + " + usr_topic_pref[6] + "+doc['category_probs'][7] + " + usr_topic_pref[7] + "+doc['category_probs'][8] + " + usr_topic_pref[8] + ";\

                            }
                        }
                    }
                ]
            }
        }
    };
}

function show_results() {
    var text = "";
    console.log(hit_results);
    hit_results.forEach((hit, i) => {
        text += "<div class='hitbox'>";
        text += "<h3 class='headline'>" + hit["_source"]["title"] + "</h3>";
        text += "<div class='subtitle'>";
        text += "<p class='source'>" + get_source_from_url(hit["_source"]["source"]) + "</p>";
        text += "<p class='date'>" + unix_time_to_date(hit["_source"]["timestamp"]) + "</p>";
        text += "</div>"
        text += "<p class='content'>" + hit["_source"]["text"].substring(0, 300) + "</p>";
        text += '<input type="button" class="continue_btn" value="Continue reading..." onclick="register_click(' +
            i +
            ')"/>';
        text += "</div>";
    });
    document.getElementById("results").innerHTML = text;
}

function unix_time_to_date(time) {
    date = new Date(time);

    var months_arr = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    var year = date.getFullYear();
    var month = months_arr[date.getMonth()];
    var day = date.getDate();
    var hour = "0" + date.getHours();
    var min = "0" + date.getMinutes();

    return day + ' ' + month + ', ' + year + '; ' + hour.substr(-2) + ':' + min.substr(-2);
}

function get_source_from_url(url) {
    result = url.replace(/^(https?:|)\/\//, "");
    result = result.substr(0, result.indexOf('/'));
    return result;
}

// Get the input field
var input = document.getElementById("search_input");

// Execute a function when the user releases a key on the keyboard
input.addEventListener("keyup", function (event) {
    // Number 13 is the "Enter" key on the keyboard
    if (event.keyCode === 13) {
        // Cancel the default action, if needed
        event.preventDefault();
        // Trigger the button element with a click
        document.getElementById("search_button").click();
    }
});
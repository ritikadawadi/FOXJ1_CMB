from flask import Flask, render_template

app = Flask(__name__)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/introduction")
def introduction():
    return render_template("introduction.html")


@app.route("/tools")
def tools():
    return render_template("tools.html")


@app.route("/results")
def results():
    return render_template("results.html")


@app.route("/results/<int:page_num>")
def results_page(page_num):
    if page_num < 1 or page_num > 5:
        return render_template("results.html")
    return render_template(f"results_{page_num}.html", page_num=page_num)


@app.route("/discussion")
def discussion():
    return render_template("discussion.html")


@app.route("/references")
def references():
    return render_template("references.html")


@app.route("/credits")
def credits():
    return render_template("credits.html")


if __name__ == "__main__":
    app.run(debug=True, port=5001)

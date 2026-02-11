from flask import Flask, request, render_template_string
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression

app = Flask(__name__)

# ---------------------------
# TRAIN MODEL (runs once when app starts)
# ---------------------------
data = pd.read_csv("auto-mpg.csv")

data = data.replace('?', np.nan)
data = data.dropna()
data["horsepower"] = data["horsepower"].astype(float)

X = data[["cylinders","displacement","horsepower","weight","acceleration","model year"]]
y = data["mpg"]

model = LinearRegression()
model.fit(X, y)

# ---------------------------
# ROUTES
# ---------------------------
@app.route("/", methods=["GET","POST"])
def home():
    prediction_text = ""

    if request.method == "POST":
        try:
            values = [float(request.form[x]) for x in request.form]
            pred = model.predict([values])[0]
            prediction_text = f"Predicted Fuel Efficiency: {pred:.2f} MPG"
        except:
            prediction_text = "Invalid Input"

    return render_template_string(html, prediction=prediction_text)

# ---------------------------
if __name__ == "__main__":
    app.run(debug=True)

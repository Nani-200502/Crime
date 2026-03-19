from dotenv import load_dotenv
from flask import Flask

from backend.edge_api.middleware.auth_guard import register_auth_guard
from backend.edge_api.middleware.rate_limit import register_rate_limiter
from backend.edge_api.middleware.request_context import register_request_context
from backend.edge_api.routes.auth_routes import auth_bp
from backend.edge_api.routes.case_routes import cases_bp
from backend.edge_api.routes.generation_routes import generation_bp
from backend.edge_api.routes.health_routes import health_bp
from backend.edge_api.routes.ui_routes import ui_bp
from backend.edge_api.utils.api_response import error_response


load_dotenv()

app = Flask(__name__)


def _register_error_handlers(flask_app: Flask) -> Flask:
	@flask_app.errorhandler(404)
	def _handle_404(_exc):
		return error_response("Endpoint not found.", 404, code="NOT_FOUND")

	@flask_app.errorhandler(405)
	def _handle_405(_exc):
		return error_response("Method not allowed.", 405, code="METHOD_NOT_ALLOWED")

	@flask_app.errorhandler(Exception)
	def _handle_uncaught(exc):
		return error_response("Unhandled server error.", 500, code="INTERNAL_ERROR", details={"type": type(exc).__name__})

	return flask_app


def create_app() -> Flask:
	register_request_context(app)
	register_rate_limiter(app)
	register_auth_guard(app)
	_register_error_handlers(app)
	app.register_blueprint(ui_bp)
	app.register_blueprint(health_bp)
	app.register_blueprint(auth_bp)
	app.register_blueprint(generation_bp)
	app.register_blueprint(cases_bp)
	return app


create_app()


if __name__ == "__main__":
	app.run(host="0.0.0.0", port=5000, debug=False)

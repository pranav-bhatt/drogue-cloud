mod sender;

use actix_web::HttpResponse;
use drogue_client::{registry, Translator};
use drogue_cloud_endpoint_common::{
    error::HttpEndpointError,
    sender::{Publish, PublishOptions, Publisher, UpstreamSender},
    sink::Sink,
};
use serde::Deserialize;

#[derive(Deserialize)]
pub struct CommandOptions {
    pub application: String,
    pub device: String,

    pub command: String,
}

pub async fn process_command<S>(
    application: registry::v1::Application,
    device: registry::v1::Device,
    gateways: Vec<registry::v1::Device>,
    sender: &UpstreamSender<S>,
    client: reqwest::Client,
    content_type: Option<String>,
    opts: CommandOptions,
    body: bytes::Bytes,
) -> Result<HttpResponse, HttpEndpointError>
where
    S: Sink,
{
    if !device.attribute::<registry::v1::DeviceEnabled>() {
        return Ok(HttpResponse::NotAcceptable().finish());
    }

    for gateway in gateways {
        if !gateway.attribute::<registry::v1::DeviceEnabled>() {
            continue;
        }

        if let Some(command) = gateway.attribute::<registry::v1::Commands>().pop() {
            return match command {
                registry::v1::Command::External(endpoint) => {
                    log::debug!("Sending to external command endpoint {:?}", endpoint);

                    let ctx = sender::Context {
                        device_id: device.metadata.name,
                        client,
                    };

                    match sender::send_to_external(ctx, endpoint, opts, body).await {
                        Ok(_) => Ok(HttpResponse::Ok().finish()),
                        Err(err) => {
                            log::info!("Failed to process external command: {}", err);
                            Ok(HttpResponse::NotAcceptable().finish())
                        }
                    }
                }
            };
        }
    }
    // no hits so far
    sender
        .publish_http_default(
            Publish {
                channel: opts.command,
                application: &application,
                device_id: opts.device,
                options: PublishOptions {
                    topic: None,
                    content_type,
                    ..Default::default()
                },
            },
            body,
        )
        .await
}

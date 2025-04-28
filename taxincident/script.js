// --- Target Pre-Tax Equilibrium ---
const Q_TARGET = 50;
const P_TARGET = 20;

document.getElementById('q-target').textContent = Q_TARGET.toFixed(2);
document.getElementById('p-target').textContent = P_TARGET.toFixed(2);

// --- DOM Elements ---
const omegaSlider = document.getElementById('omega');
const sigmaSlider = document.getElementById('sigma');
const tauSlider = document.getElementById('tau');

const omegaValueSpan = document.getElementById('omega-value');
const sigmaValueSpan = document.getElementById('sigma-value');
const tauValueSpan = document.getElementById('tau-value');

// Renamed pre-tax spans to reflect they are now targets
const qPreSpan = document.getElementById('q-target');
const pPreSpan = document.getElementById('p-target');

const qPostSpan = document.getElementById('q-post');
const pdPostSpan = document.getElementById('pd-post');
const psPostSpan = document.getElementById('ps-post');
const taxRevenueSpan = document.getElementById('tax-revenue');
const consumerBurdenSpan = document.getElementById('consumer-burden');
const producerBurdenSpan = document.getElementById('producer-burden');
const paramASpan = document.getElementById('param-a');
const paramBSpan = document.getElementById('param-b');

const plotDiv = document.getElementById('plot');

// --- Dynamic Parameter Calculation ---
function calculateDynamicParams(omega, sigma, q_target, p_target) {
    // Calculate A: p_target = A * q_target^omega
    // Handle omega = 0 case separately to avoid Math.pow(q_target, 0) potential issues if q_target were 0 (it's not here, but good practice)
    let A;
    if (omega === 0) {
        A = p_target; // If supply is perfectly elastic, A *is* the price level
    } else {
        A = p_target / Math.pow(q_target, omega);
    }

    // Calculate B: q_target = B * p_target^(-sigma)
    let B = q_target * Math.pow(p_target, sigma);

    // Handle potential edge cases resulting in NaN or Infinity
    if (!isFinite(A)) A = 1; // Default fallback
    if (!isFinite(B)) B = 1000; // Default fallback

    return { A, B };
}


// --- Equilibrium Calculation Functions ---
// Now takes dynamic A and B as arguments

function calculateEquilibrium(omega, sigma, tau, A, B) {
    // q_supply = (p_s / A)^(1/omega)  or derived from p_s = A*q^omega
    // q_demand = B * p_d^(-sigma)
    // p_d = p_s * (1 + tau)
    // Set q_supply = q_demand = q_tax
    // (p_s / A)^(1/omega) = B * (p_s * (1 + tau))^(-sigma)  -- tricky to solve for p_s directly if omega != 0

    // Let's solve for q_tax first by substituting p_s = A * q_tax^omega
    // q_tax = B * ( (A * q_tax^omega) * (1 + tau) )^(-sigma)
    // q_tax = B * A^(-sigma) * (1 + tau)^(-sigma) * q_tax^(-omega * sigma)
    // q_tax^(1 + omega * sigma) = B * A^(-sigma) * (1 + tau)^(-sigma)
    // q_tax = [ B * A^(-sigma) * (1 + tau)^(-sigma) ] ^ (1 / (1 + omega * sigma))

    // Handle omega = 0 case (perfectly elastic supply)
    let q_tax, p_s, p_d;

    if (omega === 0) {
        // Supply is horizontal at p_s = A
        p_s = A;
        p_d = p_s * (1 + tau);
        // q_tax = B * p_d ^ (-sigma)
        q_tax = B * Math.pow(p_d, -sigma);
    } else {
        // Standard case
        const exponent = 1 / (1 + omega * sigma);
        const base = B * Math.pow(A, -sigma) * Math.pow(1 + tau, -sigma);

        if (isNaN(base) || base < 0 || isNaN(exponent) || !isFinite(A) || A <=0 || !isFinite(B) || B <= 0) {
             console.error("Calculation error: Invalid base, exponent or params", { base, exponent, A, B, omega, sigma, tau });
            return { q_tax: NaN, p_s: NaN, p_d: NaN };
        }

        q_tax = Math.pow(base, exponent);
        p_s = A * Math.pow(q_tax, omega);
        p_d = p_s * (1 + tau);
    }


    if (isNaN(q_tax) || !isFinite(q_tax) || isNaN(p_s) || !isFinite(p_s) || isNaN(p_d) || !isFinite(p_d)) {
        console.error("Calculation error: Resulting equilibrium invalid", { q_tax, p_s, p_d, A, B, omega, sigma, tau });
        return { q_tax: NaN, p_s: NaN, p_d: NaN }; // Return NaN if calculation fails
    }

    return { q_tax, p_s, p_d };
}

// Pre-tax equilibrium is now *fixed* by definition, but we use the function to get consistent outputs
// We pass tau=0 and the *calculated* A and B for the current omega/sigma
function calculatePreTaxEquilibrium(omega, sigma, A, B) {
    // With dynamic A, B, this should return q_target, p_target (within floating point precision)
    const { q_tax, p_s } = calculateEquilibrium(omega, sigma, 0, A, B);
    // Use target values directly for display consistency, but calculated ones are good for verification
    // return { q_pre: q_tax, p_pre: p_s };
    return { q_pre: Q_TARGET, p_pre: P_TARGET };
}

// --- Plotting Function ---

function updatePlot() {
    // Get current elasticities from sliders
    const omega = parseFloat(omegaSlider.value);
    const sigma = parseFloat(sigmaSlider.value);
    const tau = parseFloat(tauSlider.value);

    // Update slider value displays
    omegaValueSpan.textContent = omega.toFixed(2);
    sigmaValueSpan.textContent = sigma.toFixed(2);
    tauValueSpan.textContent = tau.toFixed(2);

    // --- Calculate Dynamic A and B ---
    const { A, B } = calculateDynamicParams(omega, sigma, Q_TARGET, P_TARGET);
    paramASpan.textContent = A.toExponential(3); // Use exponential for potentially large/small values
    paramBSpan.textContent = B.toExponential(3);

    // --- Calculate Equilibria using dynamic A, B ---
    // Pre-tax is fixed by design
    const q_pre = Q_TARGET;
    const p_pre = P_TARGET;

    // Post-tax depends on tau and the dynamic A, B
    const { q_tax, p_s, p_d } = calculateEquilibrium(omega, sigma, tau, A, B);

    // Update results display (handle potential NaN)
    qPreSpan.textContent = q_pre.toFixed(2); // Display target
    pPreSpan.textContent = p_pre.toFixed(2); // Display target
    qPostSpan.textContent = isNaN(q_tax) ? 'N/A' : q_tax.toFixed(2);
    pdPostSpan.textContent = isNaN(p_d) ? 'N/A' : p_d.toFixed(2);
    psPostSpan.textContent = isNaN(p_s) ? 'N/A' : p_s.toFixed(2);

    let taxRevenue = NaN;
    let consumerBurden = NaN;
    let producerBurden = NaN;

    // Ensure all necessary values are valid numbers before calculating burden/revenue
    if (!isNaN(q_tax) && !isNaN(p_d) && !isNaN(p_s) && !isNaN(p_pre) && tau > 0) {
        taxRevenue = (p_d - p_s) * q_tax;

        const totalTaxPerUnit = p_d - p_s;
        // Ensure p_pre is treated as the benchmark
        const priceChangeConsumer = p_d - p_pre;
        const priceChangeProducer = p_pre - p_s;

        // Avoid division by zero if tax is zero or causes no price change
        if (totalTaxPerUnit > 1e-9) { // Use a small epsilon for robustness
             // Calculate raw burdens, can be outside [0, 100] temporarily if p_pre isn't exactly between p_s and p_d due to numerical precision issues or extreme elasticity effects
             let rawConsumerBurden = (priceChangeConsumer / totalTaxPerUnit) * 100;
             let rawProducerBurden = (priceChangeProducer / totalTaxPerUnit) * 100;

             // Normalize burdens to sum to 100% and stay within [0, 100]
            const totalBurdenAbs = Math.abs(rawConsumerBurden) + Math.abs(rawProducerBurden);
            if (totalBurdenAbs > 1e-9) {
                consumerBurden = Math.max(0, Math.min(100, (Math.abs(rawConsumerBurden) / totalBurdenAbs) * 100));
                producerBurden = Math.max(0, Math.min(100, (Math.abs(rawProducerBurden) / totalBurdenAbs) * 100));
                // Minor adjustment to ensure they sum exactly to 100 if needed due to rounding
                if (Math.abs(consumerBurden + producerBurden - 100) < 0.1) {
                     producerBurden = 100 - consumerBurden;
                } else { // If something is really off, fallback (e.g., if p_pre ends up outside [p_s, p_d]) - this shouldn't normally happen
                    consumerBurden = (priceChangeConsumer > 0) ? Math.max(0, Math.min(100, rawConsumerBurden)) : 0;
                    producerBurden = (priceChangeProducer > 0) ? Math.max(0, Math.min(100, rawProducerBurden)) : 0;
                }

            } else { // No price change despite tax (e.g., both perfectly elastic/inelastic - unlikely here)
                 consumerBurden = 0;
                 producerBurden = 0;
            }

        } else { // No burden if total tax per unit is effectively zero
            consumerBurden = 0;
            producerBurden = 0;
        }

    } else if (tau === 0) {
        taxRevenue = 0;
        consumerBurden = 0;
        producerBurden = 0;
    }


    taxRevenueSpan.textContent = isNaN(taxRevenue) ? 'N/A' : taxRevenue.toFixed(2);
    consumerBurdenSpan.textContent = isNaN(consumerBurden) ? 'N/A' : consumerBurden.toFixed(1);
    producerBurdenSpan.textContent = isNaN(producerBurden) ? 'N/A' : producerBurden.toFixed(1);


    // --- Generate Data for Plot ---
    // Use dynamic A, B for plotting the curves
    const q_max_plot = Math.max(q_pre * 1.5, isNaN(q_tax) ? q_pre : q_tax * 1.5, 10); // Ensure plot extends beyond equilibria
    const plot_points = 100;
    const q_values = Array.from({ length: plot_points + 1 }, (_, i) => (i / plot_points) * q_max_plot);

    // Filter out q=0 for demand/supply calculation if needed
    const valid_q_values = q_values.filter(q => q > 1e-9); // Avoid q=0

    // Supply Curve: p_s = A * q^omega
    const p_supply_values = valid_q_values.map(q => {
         if (omega === 0) return A; // Handle horizontal supply explicitly
         return A * Math.pow(q, omega);
    });


    // Demand Curve: p_d = (q / B)^(-1/sigma)
    const p_demand_values = valid_q_values.map(q => Math.pow(q / B, -1 / sigma));


    // --- Define Plotly Traces ---
    const supplyTrace = {
        x: valid_q_values, // Use only valid q values
        y: p_supply_values,
        mode: 'lines',
        name: `Supply (p_s = A * q<sup>${omega.toFixed(2)}</sup>)`, // Show omega
        line: { color: 'blue' }
    };

    const demandTrace = {
        x: valid_q_values, // Use only valid q values
        y: p_demand_values,
        mode: 'lines',
        name: `Demand (p_d = (q / B)<sup>-1/${sigma.toFixed(2)}</sup>)`, // Show sigma
        line: { color: 'red' }
    };

    const traces = [supplyTrace, demandTrace];

    // Add TARGET pre-tax equilibrium point
    traces.push({
        x: [q_pre],
        y: [p_pre],
        mode: 'markers',
        name: `Pre-Tax Eq. (q*=${q_pre.toFixed(1)}, p*=${p_pre.toFixed(1)})`,
        marker: { color: 'black', size: 10, symbol: 'circle' }
    });


    // Add post-tax points and burden lines IF tax > 0 and results are valid
    if (tau > 0 && !isNaN(q_tax) && !isNaN(p_d) && !isNaN(p_s) && !isNaN(p_pre)) {
         // Consumer Price Point
         traces.push({
            x: [q_tax],
            y: [p_d],
            mode: 'markers',
            name: `Consumer Price (p_d=${p_d.toFixed(2)})`,
            marker: { color: 'darkred', size: 8, symbol: 'cross' }
        });
         // Producer Price Point
         traces.push({
            x: [q_tax],
            y: [p_s],
            mode: 'markers',
            name: `Producer Price (p_s=${p_s.toFixed(2)})`,
            marker: { color: 'darkblue', size: 8, symbol: 'x' }
        });

         // --- Burden Visualization Lines ---

         // Vertical line for Consumer Burden (p_pre to p_d)
         traces.push({
            x: [q_tax, q_tax],
            y: [p_pre, p_d],
            mode: 'lines',
            name: 'Consumer Burden',
            line: { color: 'red', width: 2, dash: 'dot' },
            showlegend: true
        });

         // Vertical line for Producer Burden (p_s to p_pre)
         traces.push({
            x: [q_tax, q_tax],
            y: [p_s, p_pre],
            mode: 'lines',
            name: 'Producer Burden',
            line: { color: 'blue', width: 2, dash: 'dot' },
             showlegend: true
        });

         // Horizontal line at p_d
         traces.push({
             x: [0, q_tax],
             y: [p_d, p_d],
             mode: 'lines',
             line: { color: 'red', width: 1, dash: 'dash' },
             showlegend: false
         });

        // Horizontal line at p_pre
         traces.push({
             x: [0, q_tax], // Extend to q_tax for visual connection
             y: [p_pre, p_pre],
             mode: 'lines',
             line: { color: 'grey', width: 1, dash: 'dash' },
             showlegend: false
         });

         // Horizontal line at p_s
         traces.push({
             x: [0, q_tax],
             y: [p_s, p_s],
             mode: 'lines',
             line: { color: 'blue', width: 1, dash: 'dash' },
             showlegend: false
         });
    }

    // --- Define Plotly Layout ---
    // Adjust axis limits dynamically, ensuring key points are visible
    const p_max_curve = Math.max(...p_supply_values.filter(isFinite), ...p_demand_values.filter(isFinite));
    const p_axis_max = Math.max(
        p_pre * 1.5,
        isNaN(p_d) ? p_pre : p_d * 1.2, // Give slightly more room above pd
        p_max_curve * 1.1, // Ensure curves fit
        P_TARGET * 2 // Minimum sensible upper limit
    );
    const p_axis_min = 0; // Typically start price at 0

    const q_axis_max = q_max_plot * 1.05; // Use the calculated max q for plots

    const layout = {
        xaxis: {
            title: 'Quantity (q)',
            range: [0, q_axis_max] // Use calculated max q
        },
        yaxis: {
            title: 'Price (p)',
            range: [p_axis_min, p_axis_max] // Use calculated max p
        },
        title: 'Tax Incidence with Stable Pre-Tax Equilibrium',
        hovermode: 'closest',
        legend: {
            x: 0.65, // Adjust legend position if needed
            y: 0.95,
            bgcolor: 'rgba(255,255,255,0.7)' // Slightly transparent background
        },
        margin: { l: 60, r: 30, t: 50, b: 50 } // Adjust margins
    };

    // --- Create/Update Plot ---
    Plotly.newPlot(plotDiv, traces, layout);
}

// --- Event Listeners ---
omegaSlider.addEventListener('input', updatePlot);
sigmaSlider.addEventListener('input', updatePlot);
tauSlider.addEventListener('input', updatePlot);

// --- Initial Plot ---
// Ensure initial plot uses the default slider values to calculate A, B
updatePlot();